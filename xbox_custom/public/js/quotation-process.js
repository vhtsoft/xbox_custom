const STATIC_ITEM = 'Hàng có sẵn';
const ORDER_ITEM = 'Hàng đặt';


vhtfm.ui.form.on('Quotation', {
    refresh(frm) {
        if (cur_frm.doc.order_type === STATIC_ITEM) {
            cur_frm.$wrapper.find("li.user-action").each(function() {
                let actionText = $(this).text().trim(); // Lấy nội dung text của li
                if (actionText === "Yêu cầu khảo sát" || actionText === "Yêu cầu sản xuất") {
                    $(this).remove();
                }
                
            });
        }else if (cur_frm.doc.order_type === ORDER_ITEM) {
            setTimeout(() => {
                let $link = frm.$wrapper.find('li.user-action[data-label="Yêu cầu khảo sát"] a');
                let originalClickEvent = $link[0] && $._data($link[0], "events")?.click?.[0]?.handler;

                $link.off("click").on("click", function (e) {
                    e.preventDefault();

                    check_assigned_users(frm, function (hasAssigned) {
                        if (hasAssigned) {
                            console.log("Đã assigned user -> Thực hiện click mặc định");
                            originalClickEvent?.call($link[0], e); // Thực hiện sự kiện click ban đầu
                        } else {
                            assignment_event(frm);

                            // Lưu sự kiện click để thực hiện sau khi modal đóng
                            frm._pending_click_event = originalClickEvent;
                        }
                    });
                });
                
            }, 500); // Đợi một chút để đảm bảo phần tử đã tải xong
        }
        
        // Theo dõi khi modal "Assign To" đóng
        $(document).on("hidden.bs.modal", ".modal", function () {
            
            if (frm._pending_click_event) {
                check_assigned_users(frm, function (hasAssigned) {
                    if (hasAssigned) {
                        update_sales_team(frm);
                        console.log("Sau khi đóng modal: Quotation đã được assigned, thực hiện click ban đầu.");
                        frm._pending_click_event.call(frm.$wrapper.find('li.user-action[data-label="Yêu cầu khảo sát"] a')[0]);
                        frm._pending_click_event = null; // Reset biến sau khi thực hiện
                    } else {
                        console.log("Sau khi đóng modal: Quotation chưa được assigned, không thực hiện click.");
                    }
                });
            }
        });
        
    }
});

function update_sales_team(frm) {
    vhtfm.call({
        method: "vhtfm.client.get_list",
        args: {
            docmeta: "ToDo",
            filters: {
                reference_type: "Quotation",
                reference_name: frm.doc.name,
                status: "Open"
            },
            fields: ["owner"]
        },
        callback: function (r) {
            if (r.message) {
                let assigned_users = r.message.map(user => user.owner);
                
                // Lấy danh sách user hiện tại trong "Sales Team"
                let sales_team_users = frm.doc.sales_team.map(row => row.sales_person);

                assigned_users.forEach(user => {
                    if (!sales_team_users.includes(user)) {
                        let child = frm.add_child("sales_team");
                        child.sales_person = user;
                        child.allocated_percentage = 100 / assigned_users.length; // Phân bổ đều
                    }
                });

                frm.refresh_field("sales_team");
                frm.save();
                console.log("Đã cập nhật Sales Team:", assigned_users);
            }
        }
    });
}

function assignment_event(frm) {
    frm.$wrapper.find('.form-assignments .add-assignment-btn').trigger("click");
}

// Hàm kiểm tra danh sách users đã được assign
function check_assigned_users(frm, callback) {
    vhtfm.call({
        method: "vhtfm.client.get_list",
        args: {
            docmeta: "ToDo",
            filters: {
                reference_type: "Quotation",
                reference_name: frm.doc.name,
                status: "Open"
            },
            fields: ["owner"]
        },
        callback: function (r) {
            callback(r.message && r.message.length > 0);
        }
    });
}
