const workflowActions = {
    "tao_moi": "Tạo mới",
    "yc_duyet": "Yêu cầu phê duyệt"

}
vhtfm.ui.form.on("Sales Order", {
    refresh: function(frm) {
        console.log("frm.doc.update_value", frm.doc.update_value);
        
        // if (frm.doc.docstatus === 0 && !frm.doc.current_status) {  // Kiểm tra nếu đang ở trạng thái Draft và chưa có current_status
        //     frm.set_value('current_status', 'New');  // Cập nhật giá trị cho trường current_status
        // }
        // setTimeout(() => {
        //     // Ẩn dropdown Actions mặc định
        //     // frm.page.clear_actions_menu();
        //     // $(".actions-btn-group").hide();

        //     // Xóa các nút nếu đã tồn tại
        //     $(".btn-inner-group button:contains('Yêu cầu phê duyệt')").remove();
        //     $(".btn-inner-group button:contains('Gửi phòng QL đơn hàng')").remove();

        //     if (frm.doc.workflow_state === "Tạo mới") {
        //         // Nút 1
        //         frm.page.add_inner_button("Yêu cầu phê duyệt", () => {
        //             frm.set_value("workflow_state", "Chờ duyệt");
        //             frm.save();
        //         });

        //         // Nút 2
        //         frm.page.add_inner_button("Gửi phòng QL đơn hàng", () => {
        //             vhtfm.prompt(
        //                 [
        //                     {
        //                         label: "Ghi chú gửi phòng QL",
        //                         fieldname: "note",
        //                         fieldtype: "Small Text",
        //                         reqd: 1
        //                     }
        //                 ],
        //                 function(values) {
        //                     frm.set_value("manager_note", values.note);
        //                     frm.set_value("workflow_state", "Gửi QL đơn hàng");
        //                     frm.save();
        //                 },
        //                 "Gửi phòng QL đơn hàng",
        //                 "Xác nhận gửi"
        //             );
        //         });
        //     }
        // }, 100);
    }
});
