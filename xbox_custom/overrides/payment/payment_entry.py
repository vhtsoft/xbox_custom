import vhtfm
import json
from vhtfm import ValidationError, _, qb, scrub, throw
from vhterp.accounts.docmeta.payment_entry import payment_entry as payment_entry_custom
from vhterp.accounts.utils import (
	cancel_exchange_gain_loss_journal,
	get_account_currency,
	get_balance_on,
	get_outstanding_invoices,
)
from vhterp.accounts.docmeta.accounting_dimension.accounting_dimension import get_dimensions
from vhterp.setup.utils import get_exchange_rate
from vhterp.accounts.docmeta.payment_entry.payment_entry import split_invoices_based_on_payment_terms

def get_orders_to_be_billed(
	posting_date,
	party_type,
	party,
	company,
	party_account_currency,
	company_currency,
	cost_center=None,
	filters=None,
):
	voucher_type = None
	if party_type == "Customer":
		voucher_type = "Sales Order"
	elif party_type == "Supplier":
		voucher_type = "Purchase Order"

	if not voucher_type:
		return []

	# Add cost center condition
	doc = vhtfm.get_doc({"docmeta": voucher_type})
	condition = ""
	if doc and hasattr(doc, "cost_center") and doc.cost_center:
		condition = " and cost_center='%s'" % cost_center

	# dynamic dimension filters
	active_dimensions = get_dimensions()[0]
	for dim in active_dimensions:
		if filters.get(dim.fieldname):
			condition += f" and {dim.fieldname}='{filters.get(dim.fieldname)}'"

	if party_account_currency == company_currency:
		grand_total_field = "base_grand_total"
		rounded_total_field = "base_rounded_total"
	else:
		grand_total_field = "grand_total"
		rounded_total_field = "rounded_total"

	orders = vhtfm.db.sql(
		"""
		select
			name as voucher_no,
			if({rounded_total_field}, {rounded_total_field}, {grand_total_field}) as invoice_amount,
			(if({rounded_total_field}, {rounded_total_field}, {grand_total_field}) - advance_paid) as outstanding_amount,
			transaction_date as posting_date
		from
			`tab{voucher_type}`
		where
			{party_type} = %s
			and docstatus in (0, 1)
			and company = %s
			and status != "Closed"
			and if({rounded_total_field}, {rounded_total_field}, {grand_total_field}) > advance_paid
			and abs(100 - per_billed) > 0.01
			{condition}
		order by
			transaction_date, name
	""".format(
			**{
				"rounded_total_field": rounded_total_field,
				"grand_total_field": grand_total_field,
				"voucher_type": voucher_type,
				"party_type": scrub(party_type),
				"condition": condition,
			}
		),
		(party, company),
		as_dict=True,
	)

	order_list = []
	for d in orders:
		if (
			filters
			and filters.get("outstanding_amt_greater_than")
			and filters.get("outstanding_amt_less_than")
			and not (
				flt(filters.get("outstanding_amt_greater_than"))
				<= flt(d.outstanding_amount)
				<= flt(filters.get("outstanding_amt_less_than"))
			)
		):
			continue

		d["voucher_type"] = voucher_type
		# This assumes that the exchange rate required is the one in the SO
		d["exchange_rate"] = get_exchange_rate(party_account_currency, company_currency, posting_date)
		order_list.append(d)

	return order_list

def custom_get_orders_to_be_billed(
	posting_date,
	party_type,
	party,
	company,
	party_account_currency,
	company_currency,
	filters=None,
):
	
	filters["docstatus"] = ["in", [0, 1]]
  
	
	return get_orders_to_be_billed(
		posting_date,
		party_type,
		party,
		company,
		party_account_currency,
		company_currency,
		filters=filters,
	)

@vhtfm.whitelist()
def get_outstanding_reference_documents(args, validate=False):
	print("--------------------------get_outstanding_reference_documents", args)
	if isinstance(args, str):
		args = json.loads(args)

	if args.get("party_type") == "Member":
		return

	if not args.get("get_outstanding_invoices") and not args.get("get_orders_to_be_billed"):
		args["get_outstanding_invoices"] = True

	ple = qb.DocMeta("Payment Ledger Entry")
	common_filter = []
	accounting_dimensions_filter = []
	posting_and_due_date = []

	if args.get("party_type") == "Supplier":
		return []  # simplified for demo

	party_account_currency = get_account_currency(args.get("party_account"))
	company_currency = vhtfm.get_cached_value("Company", args.get("company"), "default_currency")

	if args.get("company"):
		common_filter.append(ple.company == args.get("company"))

	outstanding_invoices = []
	negative_outstanding_invoices = []

	party_account = args.get("party_account")

	if args.get("get_outstanding_invoices"):
		outstanding_invoices = get_outstanding_invoices(
			args.get("party_type"),
			args.get("party"),
			[party_account],
			common_filter=common_filter,
			posting_date=posting_and_due_date,
			accounting_dimensions=accounting_dimensions_filter,
		)

		outstanding_invoices = split_invoices_based_on_payment_terms(
			outstanding_invoices, args.get("company")
		)

	orders_to_be_billed = []
	if args.get("get_orders_to_be_billed"):
		orders_to_be_billed = custom_get_orders_to_be_billed(
			args.get("posting_date"),
			args.get("party_type"),
			args.get("party"),
			args.get("company"),
			party_account_currency,
			company_currency,
			filters=args,
		)
	

	data = negative_outstanding_invoices + outstanding_invoices + orders_to_be_billed

	if not data and not validate:
		ref_type = "invoices or orders" if args.get("get_orders_to_be_billed") else "invoices"
		msgprint(
			f"No outstanding {ref_type} found for the {args.get('party_type')} {bold(args.get('party'))}"
		)

	return data

def get_matched_payment_request_of_references(references=None):
	"""
	Get those `Payment Requests` which are matched with `References`.\n
			- Amount must be same.
			- Only single `Payment Request` available for this amount.

	Example: [(reference_docmeta, reference_name, allocated_amount, payment_request), ...]
	"""
	if not references:
		return

	# to fetch matched rows
	refs = {
		(row.reference_docmeta, row.reference_name, row.allocated_amount)
		for row in references
		if row.reference_docmeta and row.reference_name and row.allocated_amount
	}

	if not refs:
		return

	PR = vhtfm.qb.DocMeta("Payment Request")

	# query to group by reference_docmeta, reference_name, outstanding_amount
	subquery = (
		vhtfm.qb.from_(PR)
		.select(
			PR.reference_docmeta,
			PR.reference_name,
			PR.outstanding_amount.as_("allocated_amount"),
			PR.name.as_("payment_request"),
			Count("*").as_("count"),
		)
		.where(Tuple(PR.reference_docmeta, PR.reference_name, PR.outstanding_amount).isin(refs))
		.where(PR.status != "Paid")
		.where(PR.docstatus in (0, 1))
		.groupby(PR.reference_docmeta, PR.reference_name, PR.outstanding_amount)
	)

	# query to fetch matched rows which are single
	matched_prs = (
		vhtfm.qb.from_(subquery)
		.select(
			subquery.reference_docmeta,
			subquery.reference_name,
			subquery.allocated_amount,
			subquery.payment_request,
		)
		.where(subquery.count == 1)
		.run()
	)

	return matched_prs if matched_prs else None

def validate_reference_documents(self):
		valid_reference_docmetas = self.get_valid_reference_docmetas()

		if not valid_reference_docmetas:
			return

		for d in self.get("references"):
			if not d.allocated_amount:
				continue
			if d.reference_docmeta not in valid_reference_docmetas:
				vhtfm.throw(
					_("Reference Docmeta must be one of {0}").format(
						comma_or([_(d) for d in valid_reference_docmetas])
					)
				)

			elif d.reference_name:
				if not vhtfm.db.exists(d.reference_docmeta, d.reference_name):
					vhtfm.throw(_("{0} {1} does not exist").format(d.reference_docmeta, d.reference_name))
				else:
					ref_doc = vhtfm.get_doc(d.reference_docmeta, d.reference_name)

					if d.reference_docmeta != "Journal Entry":
						if self.party != ref_doc.get(scrub(self.party_type)):
							vhtfm.throw(
								_("{0} {1} is not associated with {2} {3}").format(
									_(d.reference_docmeta), d.reference_name, _(self.party_type), self.party
								)
							)
					else:
						self.validate_journal_entry()

					if d.reference_docmeta in vhtfm.get_hooks("invoice_docmetas"):
						if self.party_type == "Customer":
							ref_party_account = (
								get_party_account_based_on_invoice_discounting(d.reference_name)
								or ref_doc.debit_to
							)
						elif self.party_type == "Supplier":
							ref_party_account = ref_doc.credit_to
						elif self.party_type == "Employee":
							ref_party_account = ref_doc.payable_account

						if (
							ref_party_account != self.party_account
							and not self.book_advance_payments_in_separate_party_account
						):
							vhtfm.throw(
								_("{0} {1} is associated with {2}, but Party Account is {3}").format(
									_(d.reference_docmeta),
									d.reference_name,
									ref_party_account,
									self.party_account,
								)
							)

						if ref_doc.docmeta == "Purchase Invoice" and ref_doc.get("on_hold"):
							vhtfm.throw(
								_("{0} {1} is on hold").format(_(d.reference_docmeta), d.reference_name),
								title=_("Invalid Purchase Invoice"),
							)
def validate_journal_entry(self):
		for d in self.get("references"):
			if d.allocated_amount and d.reference_docmeta == "Journal Entry":
				je_accounts = vhtfm.db.sql(
					"""select debit, credit from `tabJournal Entry Account`
					where account = %s and party=%s and docstatus in (0, 1) and parent = %s
					and (reference_type is null or reference_type in ("", "Sales Order", "Purchase Order"))
					""",
					(self.party_account, self.party, d.reference_name),
					as_dict=True,
				)

				if not je_accounts:
					vhtfm.throw(
						_(
							"Row #{0}: Journal Entry {1} does not have account {2} or already matched against another voucher"
						).format(d.idx, d.reference_name, self.party_account)
					)
				else:
					dr_or_cr = "debit" if self.payment_type == "Receive" else "credit"
					valid = False
					for jvd in je_accounts:
						if flt(jvd[dr_or_cr]) > 0:
							valid = True
					if not valid:
						vhtfm.throw(
							_("Against Journal Entry {0} does not have any unmatched {1} entry").format(
								d.reference_name, _(dr_or_cr)
							)
						)

					
def apply():
	payment_entry_custom.validate_reference_documents = validate_reference_documents
	payment_entry_custom.get_outstanding_reference_documents = get_outstanding_reference_documents
	payment_entry_custom.get_matched_payment_request_of_references = get_matched_payment_request_of_references
	payment_entry_custom.validate_journal_entry = validate_journal_entry