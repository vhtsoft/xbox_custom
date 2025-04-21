import json
import vhtfm
from vhtfm.utils import getdate, nowdate
from vhtfm.query_builder import DocMeta as qb_DocMeta
from vhtfm import db, msgprint, bold, get_cached_value
from vhterp.accounts.utils import (
    get_account_currency,
    get_dimensions,
    get_outstanding_invoices,
)
from vhterp.accounts.docmeta.payment_entry.payment_entry import split_invoices_based_on_payment_terms

from xbox_custom.overrides.payment import custom_get_orders_to_be_billed

@vhtfm.whitelist()
def get_outstanding_reference_documents(args, validate=False):
    print("--------------------------get_outstanding_reference_documents", args)
    if isinstance(args, str):
        args = json.loads(args)

    if args.get("party_type") == "Member":
        return

    if not args.get("get_outstanding_invoices") and not args.get("get_orders_to_be_billed"):
        args["get_outstanding_invoices"] = True

    ple = qb_DocMeta("Payment Ledger Entry")
    common_filter = []
    accounting_dimensions_filter = []
    posting_and_due_date = []

    if args.get("party_type") == "Supplier":
        return []  # simplified for demo

    party_account_currency = get_account_currency(args.get("party_account"))
    company_currency = get_cached_value("Company", args.get("company"), "default_currency")

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
