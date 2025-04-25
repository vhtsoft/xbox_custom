const workflowActions = {
  tao_moi: "Tạo mới",
  yc_duyet: "Yêu cầu phê duyệt",
  rejected: __("Reject"),
  approved: __("Approve"), // Thêm trạng thái approved
};

async function update_advance_and_outstanding(frm) {
  try {
    // Bắt hệ thống tính lại grand_total trước
    await frm.script_manager.trigger("calculate_taxes_and_totals");

    let r = await vhtfm.call({
      method: "vhtfm.client.get_list",
      args: {
        docmeta: "Payment Entry",
        filters: {
          payment_type: "Receive",
          sales_order: frm.doc.name,
          docstatus: 1,
        },
        fields: ["name", "paid_amount"],
      },
    });

    if (r.message) {
      let total_advance = 0;
      r.message.forEach((pe) => {
        total_advance += flt(pe.paid_amount);
      });

      // Sau khi chắc chắn grand_total đã được tính lại
      let grand_total = flt(frm.doc.grand_total);
      let advance_paid = flt(frm.doc.advance_paid || total_advance);
      let outstanding_amount = grand_total - advance_paid;

      await frm.set_value("advance_paid_temp", total_advance);
      await frm.set_value("outstanding_amount", outstanding_amount);
    }
  } catch (err) {
    console.error("Lỗi khi cập nhật:", err);
  }
}

vhtfm.ui.form.on("Sales Taxes and Charges", {
  refresh: function (frm, cdt, cdn) {
    console.log("Bắt đầu xóa dòng thuế", cdn);
    // Đánh dấu để xử lý sau khi xóa hoàn tất
    frm.tax_row_removed = true;
  },
  rate: function (frm, cdt, cdn) {
    update_advance_and_outstanding(frm);
  },
  tax_amount: function (frm, cdt, cdn) {
    update_advance_and_outstanding(frm);
  },
  charge_type: function (frm, cdt, cdn) {
    update_advance_and_outstanding(frm);
  },
  account_head: function (frm, cdt, cdn) {
    update_advance_and_outstanding(frm);
  },
  change: function (frm, cdt, cdn) {
    console.log("change");
    update_advance_and_outstanding(frm);
  },
});

vhtfm.ui.form.on("Sales Order Item", {
  qty(frm) {
    update_advance_and_outstanding(frm);
  },
  rate(frm) {
    update_advance_and_outstanding(frm);
  },
});

vhtfm.ui.form.on("Sales Order", {
  refresh: function (frm) {
    update_advance_and_outstanding(frm);

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
  taxes_and_charges: function (frm) {
    update_advance_and_outstanding(frm);
  },

  taxes: function (frm) {
    console.log("Tax removed");
    update_advance_and_outstanding(frm);
  },
  items_on_form_rendered: function (frm) {
    update_advance_and_outstanding(frm);
  },
  // Nếu bạn muốn trigger lại khi thay đổi discount hoặc shipping charge, thêm thêm ở đây
  additional_discount_percentage: function (frm) {
    update_advance_and_outstanding(frm);
  },
  taxes_add: function (frm) {
    update_advance_and_outstanding(frm);
  },
  additional_discount_percentage: function (frm) {
    update_advance_and_outstanding(frm);
  },
  discount_amount: function (frm) {
    update_advance_and_outstanding(frm);
  },
  apply_discount_on: function (frm) {
    update_advance_and_outstanding(frm);
  },

  onload: function (frm) {
    frm.fields_dict.items.grid.df.read_only = 0;
    frm.fields_dict.items.grid.df.editable_grid = 1;
    frm.refresh_field("items");
    // Cleanup trước khi render lại
    frm.custom_onload = function () {
      $(frm.page.wrapper).find(".dropdown-menu a").off("click");
    };
  },
  sales_person: function(frm, cdt, cdn) {
      let row = locals[cdt][cdn];
      let net_total = flt(frm.doc.net_total || 0);

      // Nếu chỉ có 1 người → set full 100%
      if (frm.doc.sales_team.length === 1) {
          row.allocated_percentage = 100;
          row.allocated_amount = net_total;

          if (row.commission_rate) {
              row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
          }

          frm.refresh_field("sales_team");
      }
  },
  onload_post_render: function (frm) {
    let grid = frm.fields_dict.taxes.grid;
    if (!grid.__custom_remove_hooked) {
      grid.wrapper.on("click", ".grid-delete-row", function () {
        setTimeout(() => {
          update_advance_and_outstanding(frm);
        }, 300);
      });

      grid.wrapper.on("click", ".grid-remove-rows", function () {
        setTimeout(() => {
          update_advance_and_outstanding(frm);
        }, 300);
      });

      grid.__custom_remove_hooked = true;
    }
  },
    validate: function(frm) {

      if (frm.doc.sales_team && frm.doc.net_total) {
          frm.doc.sales_team.forEach(row => {
              if (row.contribution && row.commission_rate) {
                  row.incentives = frm.doc.net_total * (row.contribution / 100) * (row.commission_rate / 100);
              }
          });
      }
  },

});
vhtfm.ui.form.on("Sales Team", {
  sales_person: function (frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const net_total = flt(frm.doc.net_total || 0);

    // Gán mặc định nếu là người đầu tiên
    if (frm.doc.sales_team.length === 1) {
        row.allocated_percentage = 100;
        row.allocated_amount = net_total;

        // Nếu đã có commission_rate thì tính incentives luôn
        if (row.commission_rate) {
            row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
        }

        frm.refresh_field("sales_team");
    }
  },

  commission_rate: function (frm, cdt, cdn) {
    console.log("Call Commitsion_rate");
      const row = locals[cdt][cdn];

      // Tính lại incentives nếu đã có allocated_amount
      if (row.allocated_amount) {
          row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
          frm.refresh_field("sales_team");
      }
  }
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
