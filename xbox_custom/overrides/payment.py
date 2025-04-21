# from vhterp.accounts.docmeta.payment_entry.payment_entry import get_dimensions
from vhterp.accounts.docmeta.accounting_dimension.accounting_dimension import get_dimensions
import vhtfm
from vhtfm import ValidationError, _, qb, scrub, throw
from vhterp.setup.utils import get_exchange_rate

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
