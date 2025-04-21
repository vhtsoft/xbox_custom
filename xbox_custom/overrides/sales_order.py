from vhterp.selling.docmeta.sales_order.sales_order import SalesOrder
import vhtfm

class custom_sales_order(SalesOrder):
    @staticmethod
    def get_list_context(context=None):
        context = context or {}
        context.update({
            "get_list": custom_sales_order.custom_so_list
        })
        return context

    @staticmethod
    def custom_so_list(docmeta, txt, filters, limit_start, limit_page_length=20, order_by=None):
        from vhtfm.mixer.reportview import execute

        # ⚠️ Remove filter docstatus = 1
        if filters and "docstatus" in filters:
            del filters["docstatus"]

        return execute(
            docmeta,
            txt,
            filters,
            limit_start,
            limit_page_length,
            order_by=order_by,
        )

@vhtfm.whitelist()
def get_advance_paid_actual(so):
    result = vhtfm.db.sql("""
        SELECT SUM(allocated_amount)
        FROM `tabPayment Entry Reference`
        WHERE reference_docmeta = 'Sales Order'
          AND reference_name = %s
    """, (so,))
    print("---------------------------result:", result)
    return result[0][0] or 0
