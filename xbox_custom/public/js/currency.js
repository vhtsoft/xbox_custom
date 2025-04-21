vhtfm.ui.form.on('Sales Order', {
    onload: function(frm) {
        if (!vhtfm.__custom_currency_grid_patch_applied) {
            vhtfm.__custom_currency_grid_patch_applied = true;

            // Ghi đè tiêu đề label của các cột Grid khi tạo Table
            const original_make_columns = vhtfm.ui.form.ControlTable.prototype.make_columns;

            vhtfm.ui.form.ControlTable.prototype.make_columns = function() {
                const me = this;

                // Làm sạch (VND) trong label
                me.df.fields.forEach(field => {
                    if (field.label && typeof field.label === 'string') {
                        field.label = field.label.replace(/\s\([^)]+\)/, '');
                    }
                });

                // Gọi hàm gốc
                return original_make_columns.apply(this, arguments);
            };
        }
    }
});
