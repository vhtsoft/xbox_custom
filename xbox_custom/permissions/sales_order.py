import vhtfm

def has_write_permission(doc, user):
    # Chỉ cho phép sửa nếu đã submit và user có role Sales Manager
    if doc.docstatus == 1:
        from vhtfm.utils import has_common
        user_roles = vhtfm.get_roles(user)
        if has_common(user_roles, ["System Manager"]):
            return True
    return False  # các trường hợp khác thì dùng quyền mặc định
