const workflowActions = {
  tao_moi: "Tạo mới",
  yc_duyet: "Yêu cầu phê duyệt",
  rejected: __("Reject"),
  approved: __("Approve"), // Thêm trạng thái approved
};

async function update_advance_and_outstanding(frm) {
  if (frm.doc.docstatus !== 0) return;
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
    // console.log("Current workflow state:", frm);
    // update_workflow_state(frm);
    // frm.fields_dict.survey_date.df.reqd = 1;
    update_advance_and_outstanding(frm);
    // Object.keys(display_fields_by_state).forEach(fieldname => {
    //   const display_condition = get_display_depends_on_js(fieldname);
    //   console.log("Display condition for field", fieldname, ":", display_condition);
    //   frm.set_df_property(fieldname, "depends_on", display_condition);
    // });

    // vhtfm.call({
    // 	method: "xbox_custom.overrides.sales_order.get_advance_paid_actual",
    // 	args: { so: frm.doc.name },
    // 	callback(r) {
    // 		console.log("r.message:", r.message );
    // 		// frm.set_value("advance_paid_actual", r.message || 0);
    // 	}
    // });
    // frm.fields_dict.items.grid.df.read_only = 0;
    // frm.fields_dict.items.grid.df.editable_grid = 1;
    // frm.refresh_field("items");
    // frm.dashboard.clear_comment();

    // const show_dashboard_comment = (label, value, color) => {
    //   if (value) {
    //     const msg = `<strong>${label}:</strong> ${vhtfm.utils.escape_html(
    //       value
    //     )}`;
    //     frm.dashboard.add_comment(msg, color, true);
    //   }
    // };

    // if (frm.doc.workflow_state === "Rejected") {
    //   show_dashboard_comment("Lý do từ chối", frm.doc.rejection_reason, "red");
    // } else if (frm.doc.workflow_state === workflowActions.yc_duyet) {
    //   show_dashboard_comment(
    //     "Lý do yêu cầu phê duyệt",
    //     frm.doc.requirement_reason,
    //     "yellow"
    //   );
    // }

    // const bind_workflow_action = (
    //   label,
    //   confirmText,
    //   promptFields,
    //   onConfirm
    // ) => {
    //   const selector = `.dropdown-menu a:has([data-title="${label}"])`;
    //   const $element = $(frm.page.wrapper).find(selector);

    //   if (!$element.length) return;

    //   $element.off("click").on("click", function (e) {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     const executeAction = (values = {}) => {
    //       onConfirm(values);
    //       frm.doc.workflow_state = frm.doc.workflow_state;
    //       frm.save().then(() => frm.refresh());
    //     };

    //     if (promptFields && promptFields.length > 0) {
    //       vhtfm.prompt(promptFields, executeAction, confirmText, "Xác nhận");
    //     } else {
    //       vhtfm.confirm(confirmText, executeAction);
    //     }
    //   });
    // };

    // const bind_all_workflow_actions = () => {
    //   bind_workflow_action(
    //     workflowActions.approved,
    //     "Bạn có chắc muốn phê duyệt đơn hàng này?",
    //     [],
    //     () => {
    //       frm.set_value("workflow_state", "Approved");
    //       frm.set_value("requirement_reason", "");
    //       frm.set_value("rejection_reason", "");
    //     }
    //   );

    //   bind_workflow_action(
    //     workflowActions.yc_duyet,
    //     "Xác nhận yêu cầu phê duyệt",
    //     [
    //       {
    //         label: "Lý do yêu cầu phê duyệt",
    //         fieldname: "requirement_reason",
    //         fieldtype: "Small Text",
    //         reqd: 1,
    //       },
    //     ],
    //     (values) => {
    //       frm.set_value("workflow_state", workflowActions.yc_duyet);
    //       frm.set_value("requirement_reason", values.requirement_reason);
    //       frm.set_value("rejection_reason", "");
    //     }
    //   );

    //   bind_workflow_action(
    //     workflowActions.rejected,
    //     "Xác nhận từ chối",
    //     [
    //       {
    //         label: "Lý do từ chối",
    //         fieldname: "rejection_reason",
    //         fieldtype: "Small Text",
    //         reqd: 1,
    //       },
    //     ],
    //     (values) => {
    //       frm.set_value("workflow_state", "Rejected");
    //       frm.set_value("rejection_reason", values.rejection_reason);
    //       frm.set_value("requirement_reason", "");
    //     }
    //   );
    // };

    // // Gọi lần đầu khi form được refresh
    // bind_all_workflow_actions();

    // // Tạo MutationObserver để quan sát thay đổi trong dropdown-menu
    // const wrapperEl = $(frm.page.wrapper).get(0);
    // if (wrapperEl) {
    //   const observer = new MutationObserver((mutationsList) => {
    //     for (const mutation of mutationsList) {
    //       if (mutation.type === "childList") {
    //         bind_all_workflow_actions(); // Re-bind mỗi khi dropdown thay đổi
    //         break;
    //       }
    //     }
    //   });

    //   observer.observe(wrapperEl, {
    //     childList: true,
    //     subtree: true,
    //   });
    // }
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
  before_save: async function (frm) {
    if (!frm.doc.sales_team || frm.doc.sales_team.length === 0) {
      await add_logged_in_user_to_sales_team(frm);
    }
  },
  onload: function (frm) {
    frm.fields_dict.items.grid.df.read_only = 0;
    frm.fields_dict.items.grid.df.editable_grid = 1;
    frm.refresh_field("items");
    // Cleanup trước khi render lại
    frm.custom_onload = function () {
      $(frm.page.wrapper).find(".dropdown-menu a").off("click");
    };

    Object.keys(display_fields_by_state).forEach(fieldname => {
      const display_condition = get_display_depends_on_js(fieldname);
      console.log("Display condition for field", fieldname, ":", display_condition);
      frm.set_df_property(fieldname, "depends_on", display_condition);
    });

    if (frm.is_new()) {
      if (!frm.doc.sales_team || frm.doc.sales_team.length === 0) {
        add_logged_in_user_to_sales_team(frm);
      }
    }
  },
  before_workflow_action: function(frm) {
    return new Promise((resolve) => {
        const is_valid = validate_mandatory_fields(frm);
        resolve(is_valid); // Trả về true/false
    });
}
  
});

const mandatory_fields_by_state = {
  "Đơn hàng khảo sát": ["survey_date", "survey_team"],
  "Tiến hành khảo sát": ["survey_date", "survey_team"],
  "Cập nhật đơn hàng": ["survey_date", "survey_team"],
};

// function update_workflow_state(frm) {
//   const workflow_state = frm.doc.workflow_state || frm.doc.__unsaved_workflow_state;
//   const required_fields = mandatory_fields_by_state[workflow_state];
//   if (required_fields && required_fields.length > 0) {
//     required_fields.forEach(fieldname => {
//       frm.fields_dict[fieldname].df.reqd = 1;
//     });
//   }

// }
function validate_mandatory_fields(frm) {
  // 1. Kiểm tra state hiện tại có trong danh sách không
  const current_state = frm.doc.workflow_state || frm.doc.__unsaved_workflow_state;
  if (!current_state || !mandatory_fields_by_state[current_state]) {
      return true; // Không cần validate
  }

  // 2. Lấy danh sách trường bắt buộc
  const required_fields = mandatory_fields_by_state[current_state];
  let missing_fields = [];

  // 3. Kiểm tra từng trường
  required_fields.forEach(fieldname => {
      let value = frm.doc[fieldname];
      
      // Xử lý đặc biệt cho child table (survey_team)
      if (fieldname === "survey_team") {
          if (!value || value.length === 0) {
              missing_fields.push("Danh sách khảo sát viên");
          }
      } 
      // Xử lý cho các field thông thường
      else if (!value) {
          const field = frm.fields_dict[fieldname];
          missing_fields.push(field ? field.df.label : fieldname);
      }
  });

  // 4. Hiển thị thông báo nếu có trường thiếu
  if (missing_fields.length > 0) {
      vhtfm.msgprint({
          title: __("Thiếu thông tin bắt buộc"),
          indicator: "red",
          message: __("Vui lòng nhập đầy đủ các trường sau trước khi tiếp tục:") +
              "<br><ul>" + 
              missing_fields.map(f => `<li>${f}</li>`).join("") + 
              "</ul>"
      });
      return false; // Chặn không cho chuyển trạng thái
  }
  if (missing_fields.length > 0) {
    return false; // Quan trọng: return false để chặn
}
  return true; // Cho phép chuyển trạng thái
}

const display_fields_by_state = {
  survey_date: ["Đơn hàng khảo sát", "Tiến hành khảo sát", "Cập nhật đơn hàng"],
  survey_team: ["Đơn hàng khảo sát", "Tiến hành khảo sát", "Cập nhật đơn hàng"],
  fee_survey: ["Đơn hàng khảo sát", "Tiến hành khảo sát", "Cập nhật đơn hàng"],

};
function get_display_depends_on_js(fieldname) {
  const allowed_states = display_fields_by_state[fieldname];
  
  if (!allowed_states || allowed_states.length === 0) {
    // Nếu không có cấu hình thì luôn hiển thị
    return "eval:true";
  }

  // Tạo biểu thức kiểm tra workflow_state nằm trong danh sách allowed_states
  const condition = allowed_states.map(state => `doc.workflow_state == "${state}"`).join(" || ");

  return `eval:(${condition})`;
}
async function add_logged_in_user_to_sales_team(frm) {
  const user = vhtfm.session.user;

  // 1. Tìm Employee theo User
  const employee_result = await vhtfm.db.get_value(
    "Employee",
    { user_id: user },
    ["name", "employee_name"]
  );

  if (
    employee_result &&
    employee_result.message &&
    employee_result.message.name
  ) {
    const employee_id = employee_result.message.name;

    // 2. Tìm Sales Person theo Employee
    const sales_person_result = await vhtfm.db.get_value(
      "Sales Person",
      { employee: employee_id },
      ["name", "sales_person_name"]
    );

    if (
      sales_person_result &&
      sales_person_result.message &&
      sales_person_result.message.name
    ) {
      frm.add_child("sales_team", {
        sales_person: sales_person_result.message.name,
        allocated_percentage: 100,
      });
      frm.refresh_field("sales_team");
    } else {
      vhtfm.msgprint(__("Không tìm thấy Sales Person ứng với Employee này."));
    }
  } else {
    vhtfm.msgprint(__("Không tìm thấy Employee ứng với User hiện tại."));
  }
}

vhtfm.ui.form.on("Sales Team", {
  sales_person: function (frm, cdt, cdn) {
    update_team_commissions(frm, "sales_team");
  },
  commission_rate: function (frm, cdt, cdn) {
    update_team_commissions(frm, "sales_team");
  },
});

vhtfm.ui.form.on("Survey Team", {
  survey_person: function (frm, cdt, cdn) {
    update_team_commissions(frm, "survey_team");
  },
  commission_rate: function (frm, cdt, cdn) {
    update_team_commissions(frm, "survey_team");
  },
});

vhtfm.ui.form.on("Technical Team", {
  technical_person: function (frm, cdt, cdn) {
    update_team_commissions(frm, "technical_team");
  },
  commission_rate: function (frm, cdt, cdn) {
    update_team_commissions(frm, "technical_team");
  },
});

function update_team_commissions(frm, table_fieldname) {
  const rows = frm.doc[table_fieldname] || [];
  const net_total = flt(frm.doc.net_total || 0);

  if (!rows.length || net_total === 0) return;

  const equal_percent = flt(100 / rows.length, 2);

  rows.forEach((row) => {
    row.allocated_percentage = equal_percent;
    row.allocated_amount = (net_total * equal_percent) / 100;

    if (row.commission_rate) {
      row.incentives = (row.allocated_amount * flt(row.commission_rate)) / 100;
    } else {
      row.incentives = 0;
    }
  });

  frm.refresh_field(table_fieldname);
}

// vhtfm.ui.form.on("Survey Team", {
//   refresh: function(frm) {
//       // 1. Kiểm tra tồn tại child table trước khi xử lý
//       if (!frm.fields_dict || !frm.fields_dict.survey_team) {
//           console.warn("Field survey_team không tồn tại trong form");
//           return;
//       }

//       // 2. Định nghĩa formatter với kiểm tra an toàn
//       vhtfm.form.link_formatters["Employee"] = function(value, doc) {
//           if (!doc) return value;
//           return doc.employee_name || value;
//       };

//       // 3. Refresh grid với kiểm tra tồn tại
//       if (frm.fields_dict.survey_team && frm.fields_dict.survey_team.grid) {
//           try {
//               frm.fields_dict.survey_team.grid.refresh();
//           } catch (e) {
//               console.error("Lỗi khi refresh grid:", e);
//           }
//       }
//   },

//   survey_person: function(frm, cdt, cdn) {
//       // 4. Kiểm tra tồn tại các biến cần thiết
//       if (!frm.doc || !frm.doc.survey_team || !locals[cdt] || !locals[cdt][cdn]) {
//           return;
//       }

//       const row = locals[cdt][cdn];

//       // 5. Kiểm tra trước khi gọi API
//       if (row.survey_person) {
//           vhtfm.db.get_value("Employee", row.survey_person, "employee_name", (r) => {
//               if (r && r.employee_name) {
//                   vhtfm.model.set_value(cdt, cdn, "employee_name", r.employee_name);

//                   // 6. Refresh an toàn với kiểm tra tồn tại
//                   if (frm.fields_dict.survey_team && frm.fields_dict.survey_team.grid) {
//                       setTimeout(() => {
//                           frm.fields_dict.survey_team.grid.refresh();
//                       }, 100);
//                   }
//               }
//           });
//       }

//       // Phần logic tính toán (giữ nguyên)
//       const net_total = flt(frm.doc.net_total || 0);
//       if (frm.doc.survey_team && frm.doc.survey_team.length === 1) {
//           row.allocated_percentage = 100;
//           row.allocated_amount = net_total;
//           if (row.commission_rate) {
//               row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
//           }
//           frm.refresh_field("survey_team");
//       }
//   }
// });

// vhtfm.ui.form.on("Technical Team", {
//   technical_person: async function(frm, cdt, cdn) {
//     frm.doc.technical_team[0].technical_person = frm.doc.technical_team[0].employee_name
//     const row = locals[cdt][cdn];
//     const net_total = flt(frm.doc.net_total || 0);

//     // Gán mặc định nếu là người đầu tiên
//     if (frm.doc.technical_team.length === 1) {
//         row.allocated_percentage = 100;
//         row.allocated_amount = net_total;

//         // Nếu đã có commission_rate thì tính incentives luôn
//         if (row.commission_rate) {
//             row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
//         }

//         frm.refresh_field("technical_team");
//     }

//   },
//   commission_rate: function (frm, cdt, cdn) {
//     const row = locals[cdt][cdn];

//     // Tính lại incentives nếu đã có allocated_amount
//     if (row.allocated_amount) {
//         row.incentives = row.allocated_amount * (flt(row.commission_rate) / 100);
//         frm.refresh_field("technical_team");
//     }
//   }
// });

// vhtfm.form.link_formatters["Employee"] = function(value, doc) {
//   if (!doc) return value;
//   return `${doc.employee_name || ""}`;
// };

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
