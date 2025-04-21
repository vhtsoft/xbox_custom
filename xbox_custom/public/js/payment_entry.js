// Tạo hàm dùng lại
function update_custom_remarks(frm) {
    const sales_order = frm.doc.sales_order || '';
    const paid_amount = frm.doc.paid_amount || 0;
    const posting_date = frm.doc.posting_date || vhtfm.datetime.nowdate();
    const customer = frm.doc.party_name || '';  // thường là khách hàng
    
    if (!frm.doc.amount_advance) {
        frm.set_value('remarks', '');
        return;
    }
    
    if (sales_order) {
        let formatted_amount = '';
        if (paid_amount) {
            formatted_amount = new Intl.NumberFormat('vi-VN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(paid_amount) + ' đ';
        }
        
        const remark = `Tạm ứng: ${customer} / ${sales_order} / ${formatted_amount} / ${posting_date}`;
        frm.set_value('remarks', remark);
    }
}

function set_reference_doctype(frm) {
    frm.set_value("sales_order", "");
    if (frm.doc.payment_type === "Receive") {
        frm.set_value("reference_doctype", "Sales Order");
    } else if (frm.doc.payment_type === "Pay") {
        frm.set_value("reference_doctype", "Purchase Order");
    } else if (frm.doc.payment_type === "Internal Transfer") {
        frm.set_value("reference_doctype", "");
        frm.set_value("sales_order", ""); // Xóa nếu đang chọn cái cũ
        frm.toggle_display("sales_order", false); // Ẩn nếu không cần thiết
    } else {
        frm.set_value("reference_doctype", "");
        frm.set_value("sales_order", "");
        frm.toggle_display("sales_order", false);
    }
}

function toggle_amount_advance(frm) {

    if (["Receive", "Pay"].includes(frm.doc.payment_type)) {
        frm.fields_dict.amount_advance.df.hidden = 0; // Show
        frm.refresh_field("amount_advance");
    } else {
        frm.fields_dict.amount_advance.df.hidden = 1; // Show
        frm.set_value("amount_advance", 0); // Reset value
        frm.refresh_field("amount_advance");
    }
}

function references_sales_order(frm) {
    
    frm.fields_dict.references.grid.get_field('reference_name').get_query = function(doc, cdt, cdn) {
        let row = locals[cdt][cdn];
        console.log("row:", row);

        if (row.reference_docmeta === "Sales Order") {
            return {
                filters: {
                    docstatus: ["in", [0, 1]],  // 👈 Cho phép chọn cả Draft và Submitted
                    customer: doc.party
                }
            };
        }
    };
};

vhtfm.ui.form.on('Payment Entry', {
    
    onload(frm) {
        toggle_amount_advance(frm);
        references_sales_order(frm);
    },
    payment_type(frm) {
        toggle_amount_advance(frm);
        set_reference_doctype(frm);
    },
    sales_order(frm) {
        update_custom_remarks(frm);
    },
    paid_amount(frm) {
        update_custom_remarks(frm);
    },
    posting_date(frm) {
        update_custom_remarks(frm);
    },
    amount_advance(frm) {
        update_custom_remarks(frm);
    },
    
    reference_doctype: function(frm, cdt, cdn) {
        const child_row = locals[cdt][cdn];
        if (child_row.reference_doctype === "Sales Order") {
            vhtfm.meta.get_docfield("Payment Entry Reference", "reference_name", child_row.name).get_query = function() {
                return {
                    filters: [
                        ["docstatus", "in", [0, 1]],
                        ["customer", "=", frm.doc.party]
                    ]
                };
            };
            frm.refresh_field("references");
        }
    }
});


vhtfm.ui.form.on('Payment Entry Reference', {
    reference_docmeta: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.reference_docmeta === "Sales Order") {

            vhtfm.meta.get_docfield("Payment Entry Reference", "reference_name", frm.doc.name).get_query = function(doc, cdt, cdn) {
                console.log("row:", row);

                return {
                    filters: {
                        docstatus: ["in", [0, 1]], // Cho phép chọn cả Draft và Submitted
                        customer: frm.doc.party
                    }
                };
            };
        }
    }
});
