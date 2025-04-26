import vhtfm

@vhtfm.whitelist()
def get_link_title_map(docmeta, names):
    print("get_link_title_map-------------------------", docmeta, names)
	if docmeta == "Employee":
		employees = vhtfm.get_all("Employee", filters={"name": ["in", names]}, fields=["name", "employee_name"])
		return {emp.name: emp.employee_name for emp in employees}

	# fallback: return empty (default behavior)
	return {}