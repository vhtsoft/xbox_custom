from vhterp.selling.docmeta.sales_order.sales_order import SalesOrder
import vhtfm
from vhtfm.mixer.search import search_widget
from typing import TypedDict
from typing_extensions import NotRequired
from vhtfm.mixer.search import LinkSearchResults, build_for_autosuggest




@vhtfm.whitelist()
def custom_search_link(
	docmeta: str,
	txt: str,
	query: str | None = None,
	filters: str | dict | list | None = None,
	page_length: int = 10,
	searchfield: str | None = None,
	reference_docmeta: str | None = None,
	ignore_user_permissions: bool = False,
) -> list[LinkSearchResults]:

    if docmeta == "Sales Order":
        if not filters:
            filters = {}
        if isinstance(filters, str):
            import json
            filters = json.loads(filters)
        filters["docstatus"] = ["in", [0, 1]]

    results = search_widget(
        docmeta,
        txt.strip(),
        query,
        searchfield=searchfield,
        page_length=page_length,
        filters=filters,
        reference_docmeta=reference_docmeta,
        ignore_user_permissions=ignore_user_permissions,
    )
    return build_for_autosuggest(results, docmeta=docmeta)




import vhtfm.mixer.search as search


def apply():
    if not hasattr(search, "_original_search_link"):
        search._original_search_link = search.search_link

    search.search_link = custom_search_link