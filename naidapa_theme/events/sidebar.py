import json
import frappe
from frappe.desk.desktop import get_desktop_page

try:
    # Frappe v15 and earlier.
    from frappe.desk.desktop import get_workspace_sidebar_items
    DESK_ROUTE_PREFIX = "/app"
except ImportError:
    # Frappe v16 renamed the workspace-list API during the DeskViews refactor.
    from frappe.desk.desktop import get_workspaces as get_workspace_sidebar_items
    DESK_ROUTE_PREFIX = "/desk"

ICON_MAP = [
    (["home", "dashboard"], "home"),
    (["buy", "purchase", "procurement"], "check-list-3"),
    (["sell", "sale", "crm"], "briefcase"),
    (["stock", "inventory"], "clipboard"),
    (["asset"], "document-report"),
    (["acc", "finance", "pay", "tax"], "document-list"),
    (["manuf", "work", "build"], "cog"),
    (["qual", "check"], "check-all"),
    (["proj", "task"], "document-list"),
    (["supp", "help", "ticket"], "chat-bubble"),
    (["user", "hr", "employee", "payroll", "people"], "person"),
    (["web", "portal"], "laptop"),
    (["set", "setup", "tool", "config"], "cog"),
    (["integ", "api"], "grid-3"),
]

def resolve_icon(title_or_name, custom_icon=None):
    invalid_icons = ["archive", "line-md:archive", "shopping-cart", "line-md:shopping-cart"]
    if custom_icon and str(custom_icon).strip() not in invalid_icons:
        icon_str = str(custom_icon).strip()
        if icon_str.startswith("line-md:"):
            return icon_str[8:]
        return icon_str
    val = (title_or_name or "").lower()
    for keywords, icon_name in ICON_MAP:
        for kw in keywords:
            if kw in val:
                return icon_name
    return "grid-3"

@frappe.whitelist()
def get_desktop_pages():
    try:
        theme_settings = frappe.get_cached_doc("Theme Settings")
        workspace_orders = theme_settings.get("workspace_order") or []
    except Exception:
        workspace_orders = []

    if workspace_orders:
        menu_items = []
        groups_map = {}

        # Sort by row idx to strictly preserve Theme Settings row order
        sorted_orders = sorted(workspace_orders, key=lambda x: int(x.idx or 0))

        for row in sorted_orders:
            if not row.workspace:
                continue
            ws_title = row.workspace_label or frappe.db.get_value("Workspace", row.workspace, "title") or row.workspace
            ws_icon = resolve_icon(ws_title, row.icon or frappe.db.get_value("Workspace", row.workspace, "custom_animated_icon"))
            ws_name = row.workspace
            ws_route = ws_name.lower().replace(" ", "-")

            item_data = {
                "name": ws_name,
                "title": ws_title,
                "route": f"{DESK_ROUTE_PREFIX}/{ws_route}",
                "icon_name": ws_icon,
            }

            group_name = (row.workspace_group or "").strip()

            if group_name:
                if group_name in groups_map:
                    groups_map[group_name]["sub_items"].append(item_data)
                else:
                    group_item = {
                        "is_group": True,
                        "group_name": group_name,
                        "group_slug": group_name.lower().replace(" ", "-"),
                        "group_icon": resolve_icon(group_name),
                        "sub_items": [item_data]
                    }
                    groups_map[group_name] = group_item
                    menu_items.append(group_item)
            else:
                menu_items.append({
                    "is_group": False,
                    "name": ws_name,
                    "title": ws_title,
                    "route": f"{DESK_ROUTE_PREFIX}/{ws_route}",
                    "icon_name": ws_icon
                })

        return {"custom_menu": True, "items_list": menu_items}

    # Default Fallback: Standard Desktop Sidebar Pages
    pages_data = get_workspace_sidebar_items()
    pages = pages_data.get("pages", [])
    
    hidden_workspaces = []
    pages = [page for page in pages if page.get("title") not in hidden_workspaces]
    original_pages = pages
    
    parent_pages = [d for d in pages if not d.get('parent_page')]
    
    for row in parent_pages:
        custom_icon = frappe.db.get_value("Workspace", row.get("name"), "custom_animated_icon")
        row["custom_animated_icon"] = custom_icon
        row["icon_name"] = resolve_icon(row.get("title") or row.get("name"), custom_icon)
        
        row_json = json.dumps(row, default=str)
        try:
            desktop_page = get_desktop_page(row_json)
            row["cards"] = desktop_page.get("cards")
        except Exception:
            row["cards"] = []
        
        children = [d for d in original_pages if d.get('parent_page') == row.get("name")]
        for child in children:
            child_custom = frappe.db.get_value("Workspace", child.get("name"), "custom_animated_icon")
            child["custom_animated_icon"] = child_custom
            child["icon_name"] = resolve_icon(child.get("title") or child.get("name"), child_custom)
            
        row["child_workspace"] = children
        
    return {"custom_menu": False, "pages": parent_pages}

def boot_session(bootinfo):
    try:
        theme_settings = frappe.get_cached_doc("Theme Settings")
        bootinfo.sidebar_logo = theme_settings.get("sidebar_logo") or "/assets/naidapa_theme/images/logo.png"
        bootinfo.theme_settings = theme_settings.as_dict()
    except Exception:
        bootinfo.sidebar_logo = "/assets/naidapa_theme/images/logo.png"

    # The v16 /desk shell does not render this app's legacy www/app.html.
    # Supplying the menu in boot lets the desk asset create the same sidebar.
    bootinfo.naidapa_desk_route = DESK_ROUTE_PREFIX
    try:
        bootinfo.naidapa_menu_data = get_desktop_pages()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Naidapa sidebar boot failed")
        bootinfo.naidapa_menu_data = {"custom_menu": False, "pages": []}
