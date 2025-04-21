const workflowActions = {
  tao_moi: "Tạo mới",
  yc_duyet: "Yêu cầu phê duyệt",
  rejected: __("Reject"),
  approved: __("Approve"), // Thêm trạng thái approved
};

vhtfm.ui.form.on("Sales Order", {
  
  refresh: function (frm) {
    vhtfm.call({
            method: "vhtfm.client.get_list",
            args: {
                docmeta: "Payment Entry",
                filters: {
                    payment_type: "Receive", // loại nhận tiền
                    sales_order: frm.doc.name,
					docstatus: 1
                },
                fields: ["name", "paid_amount"]
            },
            callback: function(r) {
                if (r.message) {
                    let total_advance = 0;
                    r.message.forEach(function(pe) {
                        total_advance += flt(pe.paid_amount);
                    });

                    // Bạn có thể set vào một field custom nếu cần:
                    if (!frm.doc.advance_paid) {
                      frm.set_value("advance_paid_temp", total_advance);
                    }
                   
                    let grand_total = flt(frm.doc.grand_total); // Lấy tổng tiền từ Sales Order
                    let outstanding_amount;
                    if (!frm.doc.advance_paid) {
                      
                      outstanding_amount = grand_total - total_advance;
                    } else {
                        // Nếu đã có advance_paid thì dùng giá trị hiện tại
                        outstanding_amount = grand_total - frm.doc.advance_paid;
                    }
                    frm.set_value("outstanding_amount", outstanding_amount);

                   
                }
            }
        });

	// vhtfm.call({
	// 	method: "xbox_custom.overrides.sales_order.get_advance_paid_actual",
	// 	args: { so: frm.doc.name },
	// 	callback(r) {
	// 		console.log("r.message:", r.message );
	// 		// frm.set_value("advance_paid_actual", r.message || 0);
	// 	}
	// });
    frm.fields_dict.items.grid.df.read_only = 0;
    frm.fields_dict.items.grid.df.editable_grid = 1;
    frm.refresh_field("items");
    frm.dashboard.clear_comment();

    const show_dashboard_comment = (label, value, color) => {
      if (value) {
        const msg = `<strong>${label}:</strong> ${vhtfm.utils.escape_html(
          value
        )}`;
        frm.dashboard.add_comment(msg, color, true);
      }
    };

    if (frm.doc.workflow_state === "Rejected") {
      show_dashboard_comment("Lý do từ chối", frm.doc.rejection_reason, "red");
    } else if (frm.doc.workflow_state === workflowActions.yc_duyet) {
      show_dashboard_comment(
        "Lý do yêu cầu phê duyệt",
        frm.doc.requirement_reason,
        "yellow"
      );
    }

    const bind_workflow_action = (
      label,
      confirmText,
      promptFields,
      onConfirm
    ) => {
      const selector = `.dropdown-menu a:has([data-title="${label}"])`;
      const $element = $(frm.page.wrapper).find(selector);

      if (!$element.length) return;

      $element.off("click").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const executeAction = (values = {}) => {
          onConfirm(values);
          frm.doc.workflow_state = frm.doc.workflow_state;
          frm.save().then(() => frm.refresh());
        };

        if (promptFields && promptFields.length > 0) {
          vhtfm.prompt(promptFields, executeAction, confirmText, "Xác nhận");
        } else {
          vhtfm.confirm(confirmText, executeAction);
        }
      });
    };

    const bind_all_workflow_actions = () => {
      bind_workflow_action(
        workflowActions.approved,
        "Bạn có chắc muốn phê duyệt đơn hàng này?",
        [],
        () => {
          frm.set_value("workflow_state", "Approved");
          frm.set_value("requirement_reason", "");
          frm.set_value("rejection_reason", "");
        }
      );

      bind_workflow_action(
        workflowActions.yc_duyet,
        "Xác nhận yêu cầu phê duyệt",
        [
          {
            label: "Lý do yêu cầu phê duyệt",
            fieldname: "requirement_reason",
            fieldtype: "Small Text",
            reqd: 1,
          },
        ],
        (values) => {
          frm.set_value("workflow_state", workflowActions.yc_duyet);
          frm.set_value("requirement_reason", values.requirement_reason);
          frm.set_value("rejection_reason", "");
        }
      );

      bind_workflow_action(
        workflowActions.rejected,
        "Xác nhận từ chối",
        [
          {
            label: "Lý do từ chối",
            fieldname: "rejection_reason",
            fieldtype: "Small Text",
            reqd: 1,
          },
        ],
        (values) => {
          frm.set_value("workflow_state", "Rejected");
          frm.set_value("rejection_reason", values.rejection_reason);
          frm.set_value("requirement_reason", "");
        }
      );
    };

    // Gọi lần đầu khi form được refresh
    bind_all_workflow_actions();

    // Tạo MutationObserver để quan sát thay đổi trong dropdown-menu
    const wrapperEl = $(frm.page.wrapper).get(0);
    if (wrapperEl) {
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === "childList") {
            bind_all_workflow_actions(); // Re-bind mỗi khi dropdown thay đổi
            break;
          }
        }
      });

      observer.observe(wrapperEl, {
        childList: true,
        subtree: true,
      });
    }
  },

  onload: function (frm) {
    console.log("frm.fields_dict", frm.fields_dict);
    frm.fields_dict.items.grid.df.read_only = 0;
    frm.fields_dict.items.grid.df.editable_grid = 1;
    frm.refresh_field("items");
    // Cleanup trước khi render lại
    frm.custom_onload = function () {
      $(frm.page.wrapper).find(".dropdown-menu a").off("click");
    };
  },
});

// vhtfm.ui.form.on("Sales Order", {
//     refresh: function(frm) {
// console.log("frm.doc.update_value", frm.doc.update_value);

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
//     }
// });

// vhtfm.ui.form.on("Sales Order Item", {
//     validate: function (frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         if (row.type_of_item === "Section") {
//             // Nếu là Section thì xóa Item Code và không yêu cầu validate
//             row.item_code = "";
//             row.item_name = "";
//         } else {
//             // Nếu không phải Section, đảm bảo item_code phải có
//             if (!row.item_code) {
//                 vhtfm.throw(__("Item Code is required for non-section items."));
//             }
//         }
//     },
//     type_of_item: function (frm, cdt, cdn) {
//         let row = locals[cdt][cdn];
//         if (row.type_of_item === "Section") {
//             // Xóa Item Code và Item Name ngay khi chọn Section
//             vhtfm.model.set_value(cdt, cdn, "item_code", "");
//             vhtfm.model.set_value(cdt, cdn, "item_name", "");
//         }
//     }
// });
