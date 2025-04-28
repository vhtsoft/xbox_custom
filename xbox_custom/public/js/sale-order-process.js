const workflowActions = {
  tao_moi: "Tạo mới",
  yc_duyet: "Yêu cầu phê duyệt",
  rejected: __("Reject"),
  approved: __("Approve"), // Thêm trạng thái approved
};

const ADVANCE_TYPES = {
  "Thu phí khảo sát": {
    field: "no_fee_survey", // Sử dụng trường trực tiếp nếu có
    min_amount: 300000, // Giá trị tuyệt đối
  },
  "Đặt cọc thiết kế": {
    min_amount: "10%", // Tính theo % grand_total
  },
  "Đặt cọc sản xuất": {
    min_amount: "30%", // Tính theo % grand_total
  },
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

    Object.keys(display_fields_by_state).forEach((fieldname) => {
      const display_condition = get_display_depends_on_js(fieldname);

      frm.set_df_property(fieldname, "depends_on", display_condition);
    });

    if (frm.is_new()) {
      if (!frm.doc.sales_team || frm.doc.sales_team.length === 0) {
        add_logged_in_user_to_sales_team(frm);
      }
    }
  },
  before_workflow_action: async function (frm) {
    const valid = await validate_mandatory_fields(frm);
    if (!valid) {
      return false;
    }
  
    const advance_ok = await check_advance_payment(frm);
    if (!advance_ok) {
      return false;
    }
  
    return true;
  },
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

function format_currency_vietnam(amount) {
  if (amount == null) amount = 0;
  return amount.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' đ';
}

async function check_advance_payment(frm) {
  if (frm.doc.workflow_state === "Đơn hàng khảo sát") {
    console.log("Checking advance payment for survey...");
    try {
      let missing_advances = [];

      for (const [advance_type, config] of Object.entries(ADVANCE_TYPES)) {
        if (
          advance_type === "Thu phí khảo sát" &&
          frm.doc.no_fee_survey === 1
        ) {
          continue; // Nếu no_fee_survey == 1 thì bỏ qua
        }

        const { message: payments } = await vhtfm.call({
          method: "vhtfm.client.get_list",
          args: {
            docmeta: "Payment Entry",
            filters: {
              payment_type: "Receive",
              sales_order: frm.doc.name,
              docstatus: 1,
              type_advance: advance_type,
            },
            fields: ["paid_amount"],
          },
        });

        const advance_paid = payments.reduce(
          (sum, p) => sum + flt(p.paid_amount),
          0
        );

        let min_advance = 0;
        if (
          typeof config.min_amount === "string" &&
          config.min_amount.endsWith("%")
        ) {
          const percent = parseFloat(config.min_amount) / 100;
          min_advance = frm.doc.grand_total * percent;
        } else {
          min_advance = config.min_amount;
        }

        if (advance_paid < min_advance) {
          missing_advances.push(
            `<b>${advance_type}</b>: ${format_currency_vietnam(
              advance_paid
            )} / yêu cầu ${format_currency_vietnam(min_advance)}`
          );
        }
      }

      if (missing_advances.length > 0) {
        await vhtfm.msgprint({
          title: __("Không đủ tiền thanh toán"),
          indicator: "red",
          message:
            __("Các khoản thanh toán chưa đủ:") +
            "<br><ul>" +
            missing_advances.map((line) => `<li>${line}</li>`).join("") +
            "</ul>",
        });
        return false;  // <- trực tiếp return false
      }

      return true; // OK
    } catch (error) {
      console.error("Lỗi khi kiểm tra payment entries:", error);
      return false;
    }
  }
  return true;
}




async function validate_mandatory_fields(frm) {
  return new Promise(async (resolve) => {
    const current_state =
      frm.doc.workflow_state || frm.doc.__unsaved_workflow_state;
    if (!current_state || !mandatory_fields_by_state[current_state]) {
      return resolve(true);
    }

    const required_fields = mandatory_fields_by_state[current_state];
    let missing_fields = [];

    required_fields.forEach((fieldname) => {
      let value = frm.doc[fieldname];

      if (fieldname === "survey_team") {
        if (!value || value.length === 0) {
          missing_fields.push("Danh sách khảo sát viên");
        }
      } else if (!value) {
        const field = frm.fields_dict[fieldname];
        missing_fields.push(field ?  __(field.df.label) : fieldname);
      }
    });

    if (missing_fields.length > 0) {
      await vhtfm.msgprint({
        title: __("Thiếu thông tin bắt buộc"),
        indicator: "red",
        message:
          __("Vui lòng nhập đầy đủ các trường sau trước khi tiếp tục:") +
          "<br><ul>" +
          missing_fields.map((f) => `<li>${ __(f) }</li>`).join("") +
          "</ul>",
      });
      return resolve(false);
    }

    return resolve(true);
  });
}

const display_fields_by_state = {
  survey_date: ["Đơn hàng khảo sát", "Tiến hành khảo sát", "Cập nhật đơn hàng"],
  survey_team: ["Đơn hàng khảo sát", "Tiến hành khảo sát", "Cập nhật đơn hàng"],
  no_fee_survey: [
    "Đơn hàng khảo sát",
    "Tiến hành khảo sát",
    "Cập nhật đơn hàng",
  ],
};
function get_display_depends_on_js(fieldname) {
  const allowed_states = display_fields_by_state[fieldname];

  if (!allowed_states || allowed_states.length === 0) {
    // Nếu không có cấu hình thì luôn hiển thị
    return "eval:true";
  }

  // Tạo biểu thức kiểm tra workflow_state nằm trong danh sách allowed_states
  const condition = allowed_states
    .map((state) => `doc.workflow_state == "${state}"`)
    .join(" || ");

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
