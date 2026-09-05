(function () {
    "use strict";

    frappe.provide("naidapa_theme");

    naidapa_theme.is_frappe_v16 = function () {
        return window.location.pathname === '/desk' ||
            window.location.pathname.indexOf('/desk/') === 0 ||
            (frappe.boot && frappe.boot.naidapa_desk_route === '/desk');
    };

    naidapa_theme.setup = function () {
        const isV16 = naidapa_theme.is_frappe_v16();
        if (isV16) {
            $('body').addClass('naidapa-frappe-v16');
        }
        naidapa_theme.ensure_v16_sidebar();
        $('body').addClass('naidapa-theme-active');
        if (!isV16 && localStorage.getItem('naidapa_sidebar_collapsed') === 'true') {
            $('body').addClass('sidebar-menu-opened');
            $('.vertical-sidebar').addClass('semi-nav');
        }
        naidapa_theme.run_patches();
    };

    naidapa_theme.escape_html = function (value) {
        return $('<div>').text(value == null ? '' : String(value)).html();
    };

    naidapa_theme.contrast_color = function (color) {
        const hex = String(color || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);
        return ((red * 299 + green * 587 + blue * 114) / 1000) > 150 ? '#17202a' : '#ffffff';
    };

    naidapa_theme.update_v16_desktop_navbar = function () {
        if (!naidapa_theme.is_frappe_v16()) return;

        const $navbar = $('.desktop-navbar').first();
        if (!$navbar.length) return;

        const settings = (frappe.boot && frappe.boot.theme_settings) || {};
        const logo = settings.sidebar_logo || (frappe.boot && frappe.boot.sidebar_logo);
        const navbarColor = settings.primary_color || '';
        const textColor = settings.secondary_color || naidapa_theme.contrast_color(navbarColor);

        if (logo) {
            $navbar.find('#brand-logo').attr('src', logo);
        }
        if (navbarColor) {
            $navbar.css({
                'background-color': navbarColor,
                'color': textColor,
                '--text-color': textColor,
                '--text-muted': textColor
            });
        }

        const company = naidapa_theme.escape_html((frappe.boot && frappe.boot.naidapa_company_name) || '');
        const user = naidapa_theme.escape_html((frappe.boot && frappe.boot.naidapa_user_name) ||
            (frappe.session && frappe.session.user) || '');

        let $identity = $navbar.find('.naidapa-desktop-identity');
        if (!$identity.length) {
            $identity = $('<div class="naidapa-desktop-identity"></div>');
            $navbar.find('.navbar-home').first().after($identity);
        }
        const identityHtml = `${company ? `<span class="naidapa-company-name">${company}</span>` : ''}${user ? `<span class="naidapa-login-name">${__('Logged in as')} ${user}</span>` : ''}`;
        if ($identity.html() !== identityHtml) {
            $identity.html(identityHtml);
        }
    };

    naidapa_theme.sidebar_link = function (item, extraClass) {
        const title = naidapa_theme.escape_html(item.title || item.name || '');
        const route = naidapa_theme.escape_html(item.route || '#');
        const icon = naidapa_theme.escape_html(item.icon_name || 'grid-3');
        return `<li class="${extraClass || 'no-sub'}"><a href="${route}" title="${title}" class="${extraClass === 'sidebar-sub-item' ? 'sidebar-sub-link' : ''}"><span class="sidebar-item-icon"><iconify-icon icon="line-md:${icon}"></iconify-icon></span><span class="sidebar-item-label">${title}</span></a></li>`;
    };

    naidapa_theme.ensure_v16_sidebar = function () {
        // Frappe v16 provides its own persistent Workspace Sidebar.
        if (naidapa_theme.is_frappe_v16()) return;
        if ($('.vertical-sidebar').length || !frappe.boot || !frappe.boot.naidapa_menu_data) return;

        const menu = frappe.boot.naidapa_menu_data;
        const routePrefix = frappe.boot.naidapa_desk_route || '/desk';
        const logo = naidapa_theme.escape_html(frappe.boot.sidebar_logo || '/assets/naidapa_theme/images/logo.png');
        let items = '';

        if (menu.custom_menu) {
            (menu.items_list || []).forEach((item, index) => {
                if (!item.is_group) {
                    items += naidapa_theme.sidebar_link(item);
                    return;
                }
                const id = `naidapa-group-${index}`;
                const label = naidapa_theme.escape_html(item.group_name || '');
                const icon = naidapa_theme.escape_html(item.group_icon || 'grid-3');
                const children = (item.sub_items || []).map(child => naidapa_theme.sidebar_link(child, 'sidebar-sub-item')).join('');
                items += `<li class="sidebar-group-item"><a aria-expanded="true" data-bs-toggle="collapse" data-bs-target="#${id}" href="javascript:void(0)" class="sidebar-group-header"><span class="sidebar-item-icon"><iconify-icon icon="line-md:${icon}"></iconify-icon></span><span class="sidebar-item-label">${label}</span></a><ul class="collapse sidebar-group-box show" id="${id}">${children}</ul></li>`;
            });
        } else {
            (menu.pages || []).forEach((page, index) => {
                const pageRoute = `${routePrefix}/${String(page.name || '').toLowerCase().replace(/\s+/g, '-')}`;
                const pageItem = Object.assign({}, page, { route: pageRoute });
                const children = page.child_workspace || [];
                if (!children.length) {
                    items += naidapa_theme.sidebar_link(pageItem);
                    return;
                }
                const id = `naidapa-workspace-${index}`;
                const label = naidapa_theme.escape_html(page.title || page.name || '');
                const icon = naidapa_theme.escape_html(page.icon_name || 'grid-3');
                const childHtml = children.map(child => naidapa_theme.sidebar_link(Object.assign({}, child, {
                    route: `${routePrefix}/${String(child.name || '').toLowerCase().replace(/\s+/g, '-')}`
                }), 'sidebar-sub-item')).join('');
                items += `<li class="sidebar-group-item"><a aria-expanded="true" data-bs-toggle="collapse" data-bs-target="#${id}" href="javascript:void(0)" class="sidebar-group-header"><span class="sidebar-item-icon"><iconify-icon icon="line-md:${icon}"></iconify-icon></span><span class="sidebar-item-label">${label}</span></a><ul class="collapse sidebar-group-box show" id="${id}">${childHtml}</ul></li>`;
            });
        }

        const sidebar = `<nav class="vertical-sidebar"><div class="app-logo"><a class="logo d-inline-block" href="${routePrefix}" title="Home"><img alt="Logo" src="${logo}"></a></div><div class="app-nav" id="app-simple-bar" data-simplebar><ul class="main-nav p-0 mt-2">${items}</ul></div></nav>`;
        const $main = $('body > .main-section').first();
        if ($main.length) {
            // Keep .main-section as a direct body child. Frappe v16's container
            // manager relies on that hierarchy when toggling its page sidebar.
            $('body').addClass('app-wrapper ocean-theme');
            $main.addClass('app-content');
            $main.before(sidebar);
        }
    };

    naidapa_theme.setup_icon_picker = function () {
        const $target = $('[data-fieldname="custom_animated_icon"]');
        if ($target.length && !$target.find('.btn-icon-picker').length) {
            const $label = $target.find('.control-label');
            const $btn = $(`<button class="btn btn-xs btn-default btn-icon-picker" style="margin-left: 10px; margin-top: -2px; padding: 2px 8px; font-size: 10px;">
                <iconify-icon icon="line-md:search" width="12" style="vertical-align: middle;"></iconify-icon>
                <span style="vertical-align: middle; margin-left: 4px;">Choose Icon</span>
            </button>`);

            $label.append($btn);

            $btn.on('click', (e) => {
                e.preventDefault();
                naidapa_theme.show_icon_dialog();
            });

            // Double click on input
            $target.find('input').on('dblclick', () => {
                naidapa_theme.show_icon_dialog();
            });
        }
    };

    naidapa_theme.show_icon_dialog = function () {
        const icons = [
            'account', 'alert-circle', 'arrow-close-left', 'arrow-close-right', 'arrow-close-up', 
            'arrow-down', 'arrow-down-circle', 'arrow-down-circle-twotone', 'arrow-down-square', 
            'arrow-down-square-twotone', 'arrow-left', 'arrow-left-circle', 'arrow-left-circle-twotone', 
            'arrow-left-square', 'arrow-left-square-twotone', 'arrow-long-diagonal', 'arrow-long-diagonal-rotated', 
            'arrow-open-down', 'arrow-open-left', 'arrow-open-right', 'arrow-open-up', 'arrow-right', 
            'arrow-right-circle', 'arrow-right-circle-twotone', 'arrow-right-square', 'arrow-right-square-twotone', 
            'arrow-small-down', 'arrow-small-left', 'arrow-small-right', 'arrow-small-up', 'arrow-up', 
            'arrow-up-circle', 'arrow-up-circle-twotone', 'arrow-up-square', 'arrow-up-square-twotone', 
            'arrows-diagonal', 'arrows-diagonal-rotated', 'arrows-horizontal', 'arrows-horizontal-alt', 
            'arrows-vertical', 'arrows-vertical-alt', 'backup-restore', 'beer', 'bell', 'bell-alert', 
            'briefcase', 'buy-me-a-coffee', 'cake', 'calendar', 'cancel', 'chat', 'chat-bubble', 
            'check-all', 'check-list-3', 'chevron-double-down', 'chevron-double-left', 'chevron-double-right', 
            'chevron-double-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 
            'circle', 'clipboard', 'close', 'cloud', 'cloud-braces-loop', 'cloud-down', 
            'cloud-download-loop', 'cloud-upload-loop', 'coffee', 'cog', 'compass', 'computer', 
            'confirm', 'construction', 'discord', 'document', 'document-add', 'document-code', 
            'document-list', 'document-remove', 'document-report', 'double-arrow-horizontal', 
            'double-arrow-vertical', 'download-loop', 'edit', 'email', 'emoji-angry', 'emoji-frown', 
            'emoji-grin', 'emoji-neutral', 'emoji-smile', 'external-link', 'facebook', 'filter', 
            'flag', 'fork-left', 'fork-right', 'gauge', 'gauge-loop', 'github', 'grid-3', 
            'hash', 'heart', 'home', 'iconify1', 'image', 'instagram', 'laptop', 'light-dark', 
            'lightbulb', 'linkedin', 'list', 'loading-loop', 'log-in', 'log-out', 'map-marker', 
            'marker', 'mastodon', 'medical-services', 'menu', 'menu-fold-left', 'menu-fold-right', 
            'menu-to-close-transition', 'minus', 'moon', 'my-location', 'navigation', 'paint-drop', 
            'patreon', 'pause', 'pencil', 'person', 'person-add', 'person-off', 'person-search', 
            'phone', 'pixelfed', 'play', 'pleroma', 'plus', 'printer', 'question', 'reddit', 
            'refresh', 'remove', 'rotate-180', 'rotate-270', 'rotate-90', 'round-360', 'search', 
            'share', 'shield', 'shopping-cart', 'speed', 'speedometer', 'square', 'star', 
            'sun', 'switch', 'telegram', 'text-box', 'text-box-multiple', 'thumbs-down', 
            'thumbs-up', 'tiktok', 'trash', 'twitter', 'upload-loop', 'user', 'video', 'watch', 'youtube'
        ];

        const d = new frappe.ui.Dialog({
            title: __('Select Animated Icon'),
            fields: [
                { label: __('Search Icons'), fieldname: 'search', fieldtype: 'Data' },
                { label: __('Icons'), fieldname: 'icon_grid', fieldtype: 'HTML' }
            ]
        });

        const render_grid = (filter = '') => {
            let html = `<div class="icon-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px; max-height: 450px; overflow-y: auto; padding: 15px;">`;
            icons.filter(i => i.includes(filter.toLowerCase())).forEach(icon => {
                html += `
                    <div class="icon-item text-center" data-icon="${icon}" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; cursor:pointer; transition: all 0.2s; background: var(--bg-color);">
                        <iconify-icon icon="line-md:${icon}" width="28" height="28"></iconify-icon>
                        <div style="font-size: 11px; margin-top: 8px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${icon}</div>
                    </div>`;
            });
            html += `</div>`;
            d.get_field('icon_grid').$wrapper.html(html);

            d.get_field('icon_grid').$wrapper.find('.icon-item').on('mouseenter', function() {
                $(this).css({'background-color': 'var(--fg-hover-color)', 'border-color': 'var(--primary-color)', 'transform': 'scale(1.05)'});
            }).on('mouseleave', function() {
                $(this).css({'background-color': 'var(--bg-color)', 'border-color': 'var(--border-color)', 'transform': 'scale(1)'});
            }).on('click', function() {
                const selectedIcon = $(this).attr('data-icon');
                if (cur_frm) {
                    cur_frm.set_value('custom_animated_icon', selectedIcon);
                } else {
                    $('[data-fieldname="custom_animated_icon"] input').val(selectedIcon).trigger('change');
                }
                d.hide();
            });
        };

        d.fields_dict.search.$input.on('input', (e) => {
            render_grid(e.target.value);
        });

        d.show();
        render_grid();
    };

    naidapa_theme.update_sidebar_logo = function () {
        const logo_url = (frappe.boot && frappe.boot.sidebar_logo) || "/assets/naidapa_theme/images/logo.png";
        const $appLogo = $('.vertical-sidebar .app-logo');

        if ($appLogo.length) {
            let $img = $appLogo.find('img');
            if ($img.length === 0) {
                $appLogo.html(`
                    <a class="logo d-inline-block" href="/app" title="Home">
                        <img src="${logo_url}" alt="Logo" style="max-height: 42px; max-width: 180px; object-fit: contain;">
                    </a>
                `);
            } else if ($img.attr('src') !== logo_url) {
                $img.attr('src', logo_url);
            }
        }
    };

    naidapa_theme.toggle_collapse = function (el, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            }
        }

        const $link = $(el);
        let $target = $link.next('ul.collapse');

        if ($target.length === 0) {
            const targetId = $link.attr('data-bs-target') || $link.attr('href');
            if (targetId && targetId.startsWith('#')) {
                $target = $(targetId);
            }
        }

        if ($target.length) {
            const isShown = $target.hasClass('show') || $target.is(':visible');
            if (isShown) {
                $target.removeClass('show').slideUp(200);
                $link.addClass('collapsed').attr('aria-expanded', 'false');
            } else {
                $target.addClass('show').slideDown(200);
                $link.removeClass('collapsed').attr('aria-expanded', 'true');
            }
        }
        return false;
    };

    naidapa_theme.bind_collapse_events = function () {
        $(document).off('click.naidapa_collapse', '.vertical-sidebar [data-bs-toggle="collapse"]').on('click.naidapa_collapse', '.vertical-sidebar [data-bs-toggle="collapse"]', function (e) {
            naidapa_theme.toggle_collapse(this, e);
        });
    };

    naidapa_theme.run_patches = function () {
        naidapa_theme.ensure_v16_sidebar();
        if (!naidapa_theme.is_frappe_v16() && localStorage.getItem('naidapa_sidebar_collapsed') === 'true') {
            $('body').addClass('sidebar-menu-opened');
            $('.vertical-sidebar').addClass('semi-nav');
        }
        naidapa_theme.remove_native_elements();
        naidapa_theme.update_sidebar_logo();
        naidapa_theme.bind_collapse_events();
        naidapa_theme.highlight_active_route();
        naidapa_theme.mutate_workspace_container();
        naidapa_theme.mutate_custom_elements();
        naidapa_theme.inject_navbar_toggle();
        naidapa_theme.mutate_number_cards();
        naidapa_theme.setup_icon_picker();
        naidapa_theme.update_v16_desktop_navbar();
    };

    naidapa_theme.mutate_number_cards = function () {
        $('.number-widget-box').each(function (index) {
            $(this).attr('data-color-index', index % 4);
        });
    };

    naidapa_theme.position_header_toggle = function () {
        const $toggle = $('.header-toggle').first();
        if (!$toggle.length) return;

        const mobileOpen = window.matchMedia('(max-width: 991px)').matches && $('body').hasClass('sidebar-menu-opened');
        let $placeholder = $('.naidapa-toggle-placeholder').first();

        if (mobileOpen) {
            if (!$placeholder.length) {
                $placeholder = $('<span class="naidapa-toggle-placeholder" aria-hidden="true"></span>');
                $toggle.before($placeholder);
            }
            const $logoPanel = $('.vertical-sidebar .app-logo').first();
            if ($logoPanel.length && !$toggle.parent().is($logoPanel)) {
                $logoPanel.append($toggle);
            }
        } else if ($placeholder.length) {
            $placeholder.before($toggle);
            $placeholder.remove();
        }
    };

    naidapa_theme.inject_navbar_toggle = function () {
        if (naidapa_theme.is_frappe_v16()) return;
        const isCollapsed = $('body').hasClass('sidebar-menu-opened');
        const iconName = isCollapsed ? 'line-md:menu-fold-right' : 'line-md:menu-fold-left';

        if ($('.header-toggle').length === 0) {
            const toggle_html = `<span class="header-toggle" style="margin-right: 15px; cursor: pointer; display: flex; align-items: center; font-size: 22px; color: var(--text-primary);"><iconify-icon icon="${iconName}"></iconify-icon></span>`;
            $('.navbar-brand').before(toggle_html);

            // Bind click event to toggle sidebar
            $('.header-toggle').on('click', function () {
                const $body = $('body');
                const $icon = $(this).find('iconify-icon');
                const $sidebar = $('.vertical-sidebar');

                if ($body.hasClass('sidebar-menu-opened')) {
                    $body.removeClass('sidebar-menu-opened');
                    $sidebar.removeClass('semi-nav');
                    $icon.attr('icon', 'line-md:menu-fold-left');
                    localStorage.setItem('naidapa_sidebar_collapsed', 'false');
                } else {
                    $body.addClass('sidebar-menu-opened');
                    $sidebar.addClass('semi-nav');
                    $icon.attr('icon', 'line-md:menu-fold-right');
                    localStorage.setItem('naidapa_sidebar_collapsed', 'true');
                }
                naidapa_theme.position_header_toggle();
            });
        } else {
            $('.header-toggle iconify-icon').attr('icon', iconName);
        }
        naidapa_theme.position_header_toggle();
    };

    naidapa_theme.mutate_custom_elements = function () {
        const changes = [
            { selector: '.old-style-class', add: 'new-style-class', remove: 'old-style-class' },
        ];

        changes.forEach(item => {
            let $el = $(item.selector);
            if (item.remove) $el.removeClass(item.remove);
            if (item.add) $el.addClass(item.add);
        });
    };

    naidapa_theme.highlight_active_route = function () {
        const current_path = window.location.pathname.toLowerCase();
        let route_str = '';
        try {
            const route = typeof frappe !== 'undefined' && frappe.get_route ? frappe.get_route() : null;
            if (Array.isArray(route)) {
                route_str = route.join('/').toLowerCase();
            }
        } catch (e) {
            // The router is not initialized during the first v16 app_ready event.
        }

        $('.main-nav li').removeClass('active');
        $('.main-nav a').removeClass('active');

        $('.main-nav a').each(function () {
            let href = ($(this).attr('href') || '').toLowerCase();
            if (!href || href.startsWith('javascript')) return;

            let page_slug = href.replace(/^\/(app|desk)\//, '').replace('/', '');

            if (current_path === href || (page_slug && route_str && route_str.includes(page_slug))) {
                $(this).addClass('active');
                $(this).closest('li').addClass('active');

                // If active item is inside a collapsible group box, expand the group automatically
                const $groupBox = $(this).closest('ul.collapse');
                if ($groupBox.length) {
                    $groupBox.addClass('show').show();
                    const $groupHeader = $groupBox.prev('a.sidebar-group-header');
                    if ($groupHeader.length) {
                        $groupHeader.removeClass('collapsed').attr('aria-expanded', 'true');
                    }
                }
            }
        });
    };

    naidapa_theme.remove_native_elements = function () {
        if (naidapa_theme.is_frappe_v16()) return;
        $('.layout-side-section, .sidebar-toggle-btn, .desk-sidebar').hide();
    };

    naidapa_theme.mutate_workspace_container = function () {
        const selectors = [
            '#body > .content > .container',
            '#body > .content > .page-head > .container',
            '.page-body.container'
        ];

        selectors.forEach(selector => {
            $(selector).removeClass('container').addClass('container-fluid');
        });
    };

    // Premium Gradient Line Chart Injector
    naidapa_theme.mutate_charts = function () {
        // Inject the SVG linear gradient globally if it doesn't exist to ensure correct namespace rendering
        if ($('#naidapa-global-gradient').length === 0) {
            const svgHTML = `
                <svg id="naidapa-global-gradient" width="0" height="0" style="position:absolute; width:0; height:0;">
                    <defs>
                        <linearGradient id="naidapa-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#0d6b59" />
                            <stop offset="40%" stop-color="#10b981" />
                            <stop offset="65%" stop-color="#73c76b" />
                            <stop offset="85%" stop-color="#d4dda0" />
                            <stop offset="100%" stop-color="#fdf4d6" />
                        </linearGradient>
                    </defs>
                </svg>
            `;
            $('body').append(svgHTML);
        }

        // Vue components in Frappe Workspace bypass the frappe.Chart global constructor.
        // We force splines directly on rendered instances.
        $('.frappe-chart').each(function () {
            try {
                let container = $(this).get(0);
                let chart = $(container).data('chart') || (container.__vue__ && container.__vue__.chart);

                if (chart && !chart._naidapa_splined) {
                    chart._naidapa_splined = true;
                    if (chart.options && (chart.options.type === 'line' || chart.options.type === 'axis-mixed')) {
                        chart.options.lineOptions = chart.options.lineOptions || {};
                        chart.options.lineOptions.splines = 1;
                        chart.options.lineOptions.hideDots = 1;
                        chart.options.lineOptions.regionFill = 0;
                        chart.draw(); // Redraws with splines correctly!
                    }
                }
            } catch (e) { }
        });
    };

    const view_names = ["ListView", "FormView", "KanbanView", "ReportView", "GanttView", "Workspace"];
    view_names.forEach(name => {
        const Orig = frappe.views[name];
        if (!Orig) return;

        frappe.views[name] = class extends Orig {
            make() {
                super.make();
                naidapa_theme.run_patches();
            }
        };
    });

    const observer = new MutationObserver(() => {
        naidapa_theme.run_patches();
    });

    $(document).ready(() => {
        naidapa_theme.setup();
        naidapa_theme.mutate_charts(); // Try patching immediately
        observer.observe(document.body, { childList: true, subtree: true });
    });

    $(document).on('app_ready page-change', function () {
        naidapa_theme.run_patches();
        naidapa_theme.mutate_charts();
    });

    $(window).off('resize.naidapa_toggle').on('resize.naidapa_toggle', function () {
        naidapa_theme.position_header_toggle();
    });

})();
