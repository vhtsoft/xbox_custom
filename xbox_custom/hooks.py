app_name = "xbox_custom"
app_title = "XBox Custom"
app_publisher = "vhtsoft.com"
app_description = "Add some new feature to system for XBox company"
app_email = "developer@vhtsoft.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "xbox_custom",
# 		"logo": "/assets/xbox_custom/logo.png",
# 		"title": "XBox Custom",
# 		"route": "/xbox_custom",
# 		"has_permission": "xbox_custom.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of mixer.html
app_include_css = "/assets/xbox_custom/css/style.css"
app_include_js = [
    # "/assets/xbox_custom/js/quotation-process.js",
    "/assets/xbox_custom/js/currency.js",
    "/assets/xbox_custom/js/sale-order-process.js",
    "/assets/xbox_custom/js/payment_entry.js",
]

# has_permission = {
#     "Sales Order": "xbox_custom.permissions.sales_order.has_write_permission"
# }

# include js, css files in header of web template
# web_include_css = "/assets/xbox_custom/css/xbox_custom.css"
# web_include_js = "/assets/xbox_custom/js/xbox_custom.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "xbox_custom/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"docmeta": "public/js/docmeta.js"}
# webform_include_css = {"docmeta": "public/css/docmeta.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in docmeta views
# docmeta_js = {"docmeta" : "public/js/docmeta.js"}
# docmeta_list_js = {"docmeta" : "public/js/docmeta_list.js"}
# docmeta_tree_js = {"docmeta" : "public/js/docmeta_tree.js"}
# docmeta_calendar_js = {"docmeta" : "public/js/docmeta_calendar.js"}

# Svg Icons
# ------------------
# include app icons in mixer
# app_include_icons = "xbox_custom/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this docmeta
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "xbox_custom.utils.jinja_methods",
# 	"filters": "xbox_custom.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "xbox_custom.install.before_install"
# after_install = "xbox_custom.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "xbox_custom.uninstall.before_uninstall"
# after_uninstall = "xbox_custom.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "xbox_custom.utils.before_app_install"
# after_app_install = "xbox_custom.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "xbox_custom.utils.before_app_uninstall"
# after_app_uninstall = "xbox_custom.utils.after_app_uninstall"

# Mixer Notifications
# ------------------
# See vhtfm.core.notifications.get_notification_config

# notification_config = "xbox_custom.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "vhtfm.mixer.docmeta.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "vhtfm.mixer.docmeta.event.event.has_permission",
# }

# DocMeta Class
# ---------------
# Override standard docmeta classes

override_docmeta_class = {
	"Sales Order": "xbox_custom.overrides.sales_order.custom_sales_order"
}

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"xbox_custom.tasks.all"
# 	],
# 	"daily": [
# 		"xbox_custom.tasks.daily"
# 	],
# 	"hourly": [
# 		"xbox_custom.tasks.hourly"
# 	],
# 	"weekly": [
# 		"xbox_custom.tasks.weekly"
# 	],
# 	"monthly": [
# 		"xbox_custom.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "xbox_custom.install.before_tests"

# Overriding Methods
# ------------------------------
#/media/do-ngoc-tu/Data1/VHTSOFT/V15/xbox2/apps/vhterp/vhterp/accounts/docmeta/payment_entry/payment_entry.py
# override_whitelisted_methods = {
#     "vhtfm.mixer.search.search_link": "xbox_custom.overrides.sales_order.search_link",
#     "vhterp.accounts.docmeta.payment_entry.payment_entry.get_outstanding_reference_documents": "xbox_custom.overrides.outstanding.get_outstanding_reference_documents",
#     "vhterp.accounts.docmeta.payment_entry.payment_entry.validate_reference_documents": "xbox_custom.overrides.payment_entry.validate_reference_documents"

# }

# from .overrides.search_link import apply as search_link_apply
# from .overrides.payment.payment_entry import apply as payment_entry_apply
# search_link_apply()
# payment_entry_apply()
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the docmeta dashboard,
# along with any modifications made in other Vhtfm apps
# override_docmeta_dashboards = {
# 	"Task": "xbox_custom.task.get_dashboard_data"
# }

# exempt linked docmetas from being automatically cancelled
#
# auto_cancel_exempted_docmetas = ["Auto Repeat"]

# Ignore links to specified DocMetas when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["xbox_custom.utils.before_request"]
# after_request = ["xbox_custom.utils.after_request"]

# Job Events
# ----------
# before_job = ["xbox_custom.utils.before_job"]
# after_job = ["xbox_custom.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"docmeta": "{docmeta_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"docmeta": "{docmeta_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"docmeta": "{docmeta_3}",
# 		"strict": False,
# 	},
# 	{
# 		"docmeta": "{docmeta_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"xbox_custom.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_docmetas = {
# 	"Logging DocMeta Name": 30  # days to retain logs
# }

