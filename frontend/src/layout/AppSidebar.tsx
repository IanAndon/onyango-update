'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  ListIcon,
  UserCircleIcon,
  DollarLineIcon,
} from "../icons/index";
import {
  CoinsIcon,
  ShoppingCart,
  Users,
  FileText,
  FileBarChart,
  BarChart2,
  Receipt,
  Wrench,
  Package,
  Truck,
  ClipboardList,
  BookOpen,
  Wallet,
  Banknote,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/auth-context";
import CompanyLogo from "@/components/common/CompanyLogo";

type UnitCode = 'shop' | 'workshop';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pathWorkshop?: string }[];
  rolesAllowed?: string[];
  /** If set, item is shown only for these units (admin/owner/manager still see all). */
  unitsAllowed?: UnitCode[];
  group: string;
};

const SIDEBAR_GROUPS: Record<string, { label: string; order: number }> = {
  overview: { label: "Overview", order: 0 },
  workshop: { label: "Workshop", order: 1 },
  shop: { label: "Shop & Sales", order: 2 },
  onyango: { label: "Onyango Hardware", order: 3 },
  inventory: { label: "Inventory", order: 4 },
  finance: { label: "Finance", order: 5 },
  customers: { label: "Customers", order: 6 },
  reports: { label: "Reports", order: 7 },
  administration: { label: "Administration", order: 8 },
};

const navItems: NavItem[] = [
  { group: "overview", icon: <GridIcon />, name: "Dashboard", subItems: [{ name: "Overview", path: "/", pathWorkshop: "/onyango/dashboard" }], rolesAllowed: ["admin", "owner", "manager", "cashier"] },
  { group: "shop", name: "POS", icon: <ShoppingCart size={20} />, subItems: [{ name: "Shop POS", path: "/pos" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "shop", name: "Shop Dashboard", icon: <BarChart2 size={20} />, subItems: [{ name: "Overview", path: "/shop-dashboard" }], rolesAllowed: ["admin", "owner", "manager", "cashier"], unitsAllowed: ["shop"] },
  { group: "shop", name: "Sales", icon: <Receipt size={20} />, subItems: [{ name: "View Sales", path: "/sales" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "shop", name: "Store check", icon: <ClipboardList size={20} />, subItems: [{ name: "Verify orders", path: "/fulfillment" }], rolesAllowed: ["admin", "storekeeper"], unitsAllowed: ["shop"] },
  { group: "shop", name: "Material Requests", icon: <Package size={20} />, subItems: [{ name: "Approve requests", path: "/onyango/shop/material-requests" }], rolesAllowed: ["admin", "owner", "manager", "cashier"], unitsAllowed: ["shop"] },
  { group: "shop", name: "Expenses", icon: <Banknote size={20} />, subItems: [{ name: "View Expenses", path: "/expenses" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "workshop", name: "Workshop", icon: <Wrench size={20} />, subItems: [{ name: "Repair Jobs", path: "/onyango/repair-jobs" }, { name: "New Repair Job", path: "/onyango/repair-jobs/new" }, { name: "Job types", path: "/onyango/job-types" }, { name: "Material Requests (Workshop)", path: "/onyango/material-requests" }, { name: "New Material Request", path: "/onyango/material-requests/new" }, { name: "Transfer Orders", path: "/onyango/transfers" }], rolesAllowed: ["admin", "owner", "manager", "cashier"], unitsAllowed: ["workshop"] },
  { group: "onyango", name: "Suppliers & Orders", icon: <ClipboardList size={20} />, subItems: [{ name: "Suppliers", path: "/onyango/suppliers" }], rolesAllowed: ["admin", "owner", "manager", "cashier"], unitsAllowed: ["shop"] },
  { group: "inventory", name: "Products", icon: <BoxCubeIcon />, subItems: [{ name: "View Products", path: "/products" }, { name: "View Product Category", path: "/category" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "inventory", name: "Stock Audit", icon: <ListIcon />, subItems: [{ name: "Stock Movement", path: "/stock" }], rolesAllowed: ["admin"], unitsAllowed: ["shop"] },
  { group: "finance", name: "Expenses", icon: <DollarLineIcon />, subItems: [{ name: "View Expenses", path: "/expenses" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop", "workshop"] },
  { group: "finance", name: "Loans", icon: <CoinsIcon />, subItems: [{ name: "View Loan", path: "/loans" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "finance", name: "Cashbook", icon: <BookOpen size={20} />, subItems: [{ name: "Shop Cashbook", path: "/cashbook" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "finance", name: "Workshop Cashbook", icon: <Wallet size={20} />, subItems: [{ name: "Cashbook", path: "/onyango/cashbook" }], rolesAllowed: ["admin", "owner", "manager", "cashier"], unitsAllowed: ["workshop"] },
  { group: "finance", name: "Workshop Payments", icon: <Truck size={20} />, subItems: [{ name: "Transfer Orders", path: "/onyango/transfers" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "finance", name: "Quotes", icon: <Receipt size={20} />, subItems: [{ name: "New quote", path: "/quotes/new" }], rolesAllowed: ["admin", "cashier"], unitsAllowed: ["shop"] },
  { group: "customers", name: "Customers", icon: <Users size={20} />, subItems: [{ name: "View Customer", path: "/customers" }], rolesAllowed: ["admin", "cashier"] },
  {
    group: "reports",
    name: "Shop Reports",
    icon: <FileText size={20} />,
    subItems: [
      { name: "Stock Reports", path: "/report/stock" },
      { name: "Sales Reports", path: "/report/sales" },
      { name: "Profitability (Short)", path: "/report/short" },
      { name: "Debts & Statements", path: "/report/customer-statement" },
      { name: "Cashbook report", path: "/report/cashbook-report" },
    ],
    rolesAllowed: ["admin"],
    unitsAllowed: ["shop"],
  },
  {
    group: "reports",
    name: "Workshop Reports",
    icon: <FileBarChart size={20} />,
    subItems: [
      { name: "Overview", path: "/onyango/dashboard" },
      { name: "Cashbook", path: "/onyango/cashbook" },
      { name: "Transfer Orders", path: "/onyango/transfers" },
    ],
    rolesAllowed: ["admin"],
    unitsAllowed: ["workshop"],
  },
  { group: "administration", name: "Unit Overview", icon: <Building2 size={20} />, path: "/admin/unit-overview", rolesAllowed: ["admin", "owner", "manager"] },
  { group: "administration", icon: <UserCircleIcon />, name: "Users", path: "/users", rolesAllowed: ["admin"] },
];

const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const isCrossUnit = useMemo(() => user && ['admin', 'owner', 'manager'].includes(user.role), [user?.role]);
  const userUnit = (user?.unit_code as UnitCode) || null;

  const filteredNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => {
      // Hide items with no sub-items (e.g. Workshop Reports after removing duplicates)
      if (item.subItems && item.subItems.length === 0) return false;
      // Hide top-level Overview group for shop cashiers (they use Shop Dashboard instead)
      if (
        item.group === "overview" &&
        user.role === "cashier" &&
        userUnit === "shop"
      ) {
        return false;
      }
      // Shop items (e.g. Approve requests /onyango/shop/material-requests): only for unit "shop" or admin/owner/manager. Workshop cashier must NOT see them.
      const unitOk = !item.unitsAllowed || isCrossUnit || (userUnit && item.unitsAllowed.includes(userUnit));
      if (!unitOk) return false;
      const roleOk = !item.rolesAllowed || item.rolesAllowed.includes(user.role);
      const unitMatch = userUnit && item.unitsAllowed?.includes(userUnit);
      return roleOk || unitMatch;
    });
  }, [user?.role, userUnit, isCrossUnit]);

  const groupedNavItems = useMemo(() => {
    const map: Record<string, NavItem[]> = {};
    for (const item of filteredNavItems) {
      const g = item.group || "administration";
      if (!map[g]) map[g] = [];
      map[g].push(item);
    }
    return Object.entries(SIDEBAR_GROUPS)
      .sort((a, b) => a[1].order - b[1].order)
      .filter(([key]) => map[key]?.length)
      .map(([key]) => ({ groupKey: key, label: SIDEBAR_GROUPS[key].label, items: map[key] }));
  }, [filteredNavItems]);

  const [openSubmenu, setOpenSubmenu] = useState<{ groupKey: string; indexInGroup: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let matched: { groupKey: string; indexInGroup: number } | null = null;
    for (const { groupKey, items } of groupedNavItems) {
      items.forEach((item, indexInGroup) => {
        if (item.subItems?.some((sub) => {
          const href = (sub.pathWorkshop && userUnit === 'workshop') ? sub.pathWorkshop : sub.path;
          return isActive(href);
        })) matched = { groupKey, indexInGroup };
      });
    }
    setOpenSubmenu(matched);
  }, [pathname, isActive, groupedNavItems, userUnit]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.groupKey}-${openSubmenu.indexInGroup}`;
      const el = subMenuRefs.current[key];
      if (el) setSubMenuHeight((prev) => ({ ...prev, [key]: el.scrollHeight }));
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (groupKey: string, indexInGroup: number) => {
    setOpenSubmenu((prev) => (prev?.groupKey === groupKey && prev.indexInGroup === indexInGroup ? null : { groupKey, indexInGroup }));
  };

  const renderMenuItems = (items: NavItem[], groupKey: string) => (
    <ul className="flex flex-col gap-1">
      {items.map((item, indexInGroup) => (
        <li key={item.name}>
          {item.subItems ? (
            <>
              <button
                onClick={() => handleSubmenuToggle(groupKey, indexInGroup)}
                className={`sidebar-dark-item w-full ${openSubmenu?.groupKey === groupKey && openSubmenu.indexInGroup === indexInGroup ? "sidebar-dark-item-active" : ""}`}
              >
                <span className="shrink-0 opacity-90">{item.icon}</span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDownIcon className={`ml-auto h-4 w-4 shrink-0 transition-transform ${openSubmenu?.groupKey === groupKey && openSubmenu.indexInGroup === indexInGroup ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
              {(isExpanded || isHovered || isMobileOpen) && (
                <div ref={(el) => { subMenuRefs.current[`${groupKey}-${indexInGroup}`] = el; }} className="overflow-hidden transition-all duration-200" style={{ height: openSubmenu?.groupKey === groupKey && openSubmenu.indexInGroup === indexInGroup ? `${subMenuHeight[`${groupKey}-${indexInGroup}`] ?? 0}px` : "0px" }}>
                  <ul className="space-y-0.5 py-2 pl-11 pr-2">
                    {item.subItems.map((sub) => {
                      const href = (sub.pathWorkshop && userUnit === 'workshop') ? sub.pathWorkshop : sub.path;
                      return (
                        <li key={sub.name}>
                          <Link href={href} className={`block sidebar-dark-sub ${isActive(href) ? "sidebar-dark-sub-active" : ""}`}>
                            {sub.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : item.path ? (
            <Link href={item.path} className={`sidebar-dark-item ${isActive(item.path) ? "sidebar-dark-item-active" : ""}`}>
              <span className="shrink-0 opacity-90">{item.icon}</span>
              {(isExpanded || isHovered || isMobileOpen) && <span>{item.name}</span>}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );

  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col bg-brand-900 dark:bg-gray-950 text-white transition-all duration-300 ease-out
        ${showText ? "w-[280px]" : "w-[72px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-3">
          <CompanyLogo variant="dark" size={40} className="shrink-0" />
          {showText && <span className="font-semibold tracking-tight text-white">Onyango Construction</span>}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5 no-scrollbar">
        {groupedNavItems.map(({ groupKey, label, items }) => (
          <div key={groupKey}>
            {showText ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {label}
              </p>
            ) : (
              <div className="mb-2 h-px bg-white/10" />
            )}
            {renderMenuItems(items, groupKey)}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AppSidebar;
