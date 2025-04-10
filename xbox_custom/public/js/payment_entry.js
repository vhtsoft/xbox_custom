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

vhtfm.ui.form.on('Payment Entry', {
    
    onload(frm) {
        toggle_amount_advance(frm);
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
    }
});