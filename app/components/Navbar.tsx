
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import BusinessModal from "@/app/components/BusinessModal";

type Role =
    | "master_admin"
    | "clinic_admin"
    | "receptionist"
    | "doctor";

type MenuItem = {
    label: string;
    href: string;
    icon: string;
};

type BookingMode = "doctor" | "department";

type ClinicOption = {
    id: string;
    name: string;
    address: string | null;
    is_active: boolean;
};

function normalizeBookingMode(value: unknown): BookingMode | null {
    if (typeof value !== "string") return null;

    const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");

    if (
        normalized === "department" ||
        normalized === "department-wise" ||
        normalized === "department-centric"
    ) return "department";

    if (
        normalized === "doctor" ||
        normalized === "doctor-wise" ||
        normalized === "doctor-centric"
    ) return "doctor";

    return null;
}

type NavbarProps = {
    email?: string;
    displayName?: string;
    role?: Role;
};

const navigationByRole: Record<Role, MenuItem[]> = {
    master_admin: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Queue", href: "/queues", icon: "queue" },
        { label: "Appointments", href: "/appointments", icon: "calendar" },
        { label: "Rooms", href: "/rooms", icon: "rooms" },
        { label: "Patients", href: "/patients", icon: "patients" },
    ],

    // Clinic Admin dashboard is handled by app/page.tsx
    clinic_admin: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Queue", href: "/queues", icon: "queue" },
        { label: "Appointments", href: "/appointments", icon: "calendar" },
        { label: "Rooms", href: "/rooms", icon: "rooms" },
        { label: "Patients", href: "/patients", icon: "patients" },
        { label: "Team", href: "/team", icon: "team" },
    ],

    // Receptionist dashboard is also handled by app/page.tsx
    receptionist: [
        { label: "Dashboard", href: "/", icon: "dashboard" },
        { label: "Queue", href: "/queues", icon: "queue" },
        { label: "Appointments", href: "/appointments", icon: "calendar" },
        { label: "Rooms", href: "/rooms", icon: "rooms" },
        { label: "Patients", href: "/patients", icon: "patients" },
        { label: "Team", href: "/team", icon: "team" },
    ],

    doctor: [
        { label: "Dashboard", href: "/doctor-dashboard", icon: "dashboard" },
        { label: "Queue", href: "/queues", icon: "queue" },
        { label: "Appointments", href: "/appointments", icon: "calendar" },
        { label: "Patients", href: "/patients", icon: "patients" },
    ],
};

const profileByRole: Record<Role, MenuItem[]> = {
    master_admin: [
        { label: "Insights", href: "/insights", icon: "insights" },
        { label: "History", href: "/history", icon: "history" },
        { label: "My plan", href: "/plan", icon: "plan" },
        { label: "Team", href: "/team", icon: "team" },
        { label: "Settings", href: "/settings", icon: "settings" },
        { label: "Account", href: "/account", icon: "account" },
        { label: "Password", href: "/password", icon: "password" },
    ],

    clinic_admin: [
        { label: "Insights", href: "/insights", icon: "insights" },
        { label: "History", href: "/history", icon: "history" },
        { label: "Team", href: "/team", icon: "team" },
        { label: "Settings", href: "/settings", icon: "settings" },
        { label: "Account", href: "/account", icon: "account" },
        { label: "Password", href: "/password", icon: "password" },
    ],

    receptionist: [
        { label: "History", href: "/history", icon: "history" },
        { label: "Account", href: "/account", icon: "account" },
        { label: "Password", href: "/password", icon: "password" },
    ],

    doctor: [
        { label: "Insights", href: "/insights", icon: "insights" },
        { label: "History", href: "/history", icon: "history" },
        { label: "Account", href: "/account", icon: "account" },
        { label: "Password", href: "/password", icon: "password" },
    ],
};

function Icon({
    name,
    size = 18,
}: {
    name: string;
    size?: number;
}) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        "aria-hidden": true as const,
    };

    switch (name) {
        case "dashboard":
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            );

        case "queue":
            return (
                <svg {...common}>
                    <path d="M9 6h12M9 12h12M9 18h12" />
                    <circle cx="4" cy="6" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="4" cy="18" r="1" />
                </svg>
            );

        case "calendar":
            return (
                <svg {...common}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
            );

        case "rooms":
        case "business":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="16" height="18" rx="1" />
                    <path d="M9 21V8h6v13M4 8h16" />
                </svg>
            );

        case "patients":
        case "account":
            return (
                <svg {...common}>
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                </svg>
            );

        case "doctors":
            return (
                <svg {...common}>
                    <circle cx="9" cy="7" r="4" />
                    <path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6M16 11h6" />
                </svg>
            );

        case "departments":
            return (
                <svg {...common}>
                    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
                </svg>
            );

        case "insights":
            return (
                <svg {...common}>
                    <path d="M4 20V5M4 20h17m-13-5 4-5 4 3 4-7" />
                </svg>
            );

        case "history":
            return (
                <svg {...common}>
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
                </svg>
            );

        case "plan":
            return (
                <svg {...common}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18" />
                </svg>
            );

        case "team":
            return (
                <svg {...common}>
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
                </svg>
            );

        case "settings":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8-.2 1.7 1.7 0 0 0-1 1.5v.2h-3.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.2l-.2.1-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8.2 1.7 1.7 0 0 0 1-1.5v-.2H15v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.2l.2-.1 1.8 3.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
                </svg>
            );

        case "password":
            return (
                <svg {...common}>
                    <circle cx="8" cy="15" r="5" />
                    <path d="m12 11 8-8 3 3-2 2 1 2-3 3-2-2-3 3" />
                </svg>
            );

        case "signout":
            return (
                <svg {...common}>
                    <path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
                </svg>
            );

        default:
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            );
    }
}

export default function Navbar({
    email,
    displayName,
    role = "clinic_admin",
}: NavbarProps) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [businessModalOpen, setBusinessModalOpen] = useState(false);
    const [clinicsOpen, setClinicsOpen] = useState(false);
    const [clinics, setClinics] = useState<ClinicOption[]>([]);
    const [clinicsLoading, setClinicsLoading] = useState(true);
    const [clinicsError, setClinicsError] = useState("");
    const [activeClinicId, setActiveClinicId] = useState("");
    const [clinicBookingMode, setClinicBookingMode] =
        useState<BookingMode | null>(null);
    const [masterClinicBookingMode, setMasterClinicBookingMode] =
        useState<BookingMode | null>(null);
    const [mounted, setMounted] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState("");

    const pathname = usePathname();
    const router = useRouter();
    const { theme, resolvedTheme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load all clinics for Master Admin.
    useEffect(() => {
        let cancelled = false;

        async function loadClinics() {
            if (role !== "master_admin") {
                setClinicsLoading(false);
                return;
            }

            setClinicsLoading(true);
            setClinicsError("");

            try {
                const supabase = createClient();

                const { data, error } = await supabase
                    .from("clinics")
                    .select("id, name, address, is_active")
                    .order("name", { ascending: true });

                if (error) throw error;

                if (!cancelled) {
                    const clinicList: ClinicOption[] = data ?? [];
                    setClinics(clinicList);

                    const params = new URLSearchParams(window.location.search);
                    const queryClinicId = params.get("clinicId") ?? "";

                    setActiveClinicId(
                        clinicList.some((clinic) => clinic.id === queryClinicId)
                            ? queryClinicId
                            : ""
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setClinicsError(
                        error instanceof Error
                            ? error.message
                            : "Unable to load clinics."
                    );
                }
            } finally {
                if (!cancelled) {
                    setClinicsLoading(false);
                }
            }
        }

        void loadClinics();

        return () => {
            cancelled = true;
        };
    }, [role]);

    // Load booking mode for Clinic Admin.
    useEffect(() => {
        if (role !== "clinic_admin") return;

        let cancelled = false;

        async function loadClinicBookingMode() {
            try {
                const supabase = createClient();

                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError) throw authError;
                if (!user) throw new Error("User not authenticated.");

                const { data: membership, error: membershipError } =
                    await supabase
                        .from("clinic_memberships")
                        .select("clinic_id")
                        .eq("user_id", user.id)
                        .eq("role", "administrator")
                        .eq("is_active", true)
                        .limit(1)
                        .maybeSingle();

                if (membershipError) throw membershipError;

                if (!membership?.clinic_id) {
                    if (!cancelled) setClinicBookingMode(null);
                    return;
                }

                const { data: settings, error: settingsError } = await supabase
                    .from("clinic_settings")
                    .select("booking_mode")
                    .eq("clinic_id", membership.clinic_id)
                    .maybeSingle();

                if (settingsError) throw settingsError;
                if (!settings) throw new Error("Clinic settings not found.");

                if (!cancelled) {
                    setClinicBookingMode(
                        normalizeBookingMode(settings.booking_mode)
                    );
                }
            } catch (error) {
                console.error("Clinic booking mode loading error:", error);
                if (!cancelled) setClinicBookingMode(null);
            }
        }

        void loadClinicBookingMode();

        return () => {
            cancelled = true;
        };
    }, [role]);

    // Synchronize selected clinic with URL.
    useEffect(() => {
        if (role !== "master_admin") return;

        const params = new URLSearchParams(window.location.search);
        const queryClinicId = params.get("clinicId") ?? "";

        setActiveClinicId(
            clinics.some((clinic) => clinic.id === queryClinicId)
                ? queryClinicId
                : ""
        );
    }, [pathname, clinics, role]);

    // Load selected clinic booking mode for Master Admin.
    useEffect(() => {
        if (role !== "master_admin" || !activeClinicId) {
            setMasterClinicBookingMode(null);
            return;
        }

        let cancelled = false;

        async function loadSelectedClinicBookingMode() {
            try {
                const supabase = createClient();

                const { data, error } = await supabase
                    .from("clinic_settings")
                    .select("booking_mode")
                    .eq("clinic_id", activeClinicId)
                    .maybeSingle();

                if (error) throw error;

                if (!cancelled) {
                    setMasterClinicBookingMode(
                        normalizeBookingMode(data?.booking_mode)
                    );
                }
            } catch (error) {
                console.error("Selected clinic booking mode error:", error);
                if (!cancelled) setMasterClinicBookingMode(null);
            }
        }

        void loadSelectedClinicBookingMode();

        return () => {
            cancelled = true;
        };
    }, [role, activeClinicId]);

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setProfileOpen(false);
                setBusinessModalOpen(false);
                setClinicsOpen(false);
            }
        }

        window.addEventListener("keydown", closeOnEscape);

        return () => {
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    function selectClinic(clinicId: string) {
        setActiveClinicId(clinicId);
        setClinicsOpen(false);

        const params = new URLSearchParams(window.location.search);

        if (clinicId) {
            params.set("clinicId", clinicId);
        } else {
            params.delete("clinicId");
        }

        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;

        router.push(url);
    }

    // Preserve selected clinic for Master Admin navigation.
    function getNavigationHref(href: string) {
        if (role !== "master_admin" || !activeClinicId) {
            return href;
        }

        const params = new URLSearchParams();
        params.set("clinicId", activeClinicId);

        return `${href}?${params.toString()}`;
    }

    async function handleSignOut() {
        setSigningOut(true);
        setSignOutError("");

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            router.replace("/auth/login");
            router.refresh();
        } catch {
            setSignOutError("Unable to sign out. Please try again.");
            setSigningOut(false);
        }
    }

    const isDark = mounted
        ? (resolvedTheme ?? theme) === "dark"
        : false;

    const selectedClinic = clinics.find(
        (clinic) => clinic.id === activeClinicId
    );

    const selectedBookingMode: BookingMode | null =
        role === "master_admin"
            ? masterClinicBookingMode
            : role === "clinic_admin"
                ? clinicBookingMode
                : null;

    const managementItem: MenuItem | null = selectedBookingMode
        ? {
            label:
                selectedBookingMode === "department"
                    ? "Departments"
                    : "Doctors",
            href:
                selectedBookingMode === "department"
                    ? "/departments"
                    : "/doctors",
            icon:
                selectedBookingMode === "department"
                    ? "departments"
                    : "doctors",
        }
        : null;

    const clinicAdminNavigation = navigationByRole.clinic_admin.filter(
        (item) => item.href !== "/doctors"
    );

    const mainNavigation: MenuItem[] =
        role === "clinic_admin"
            ? [
                ...clinicAdminNavigation.slice(0, -1),
                ...(managementItem ? [managementItem] : []),
                ...clinicAdminNavigation.slice(-1),
            ]
            : navigationByRole[role];

    const profileNavigation: MenuItem[] =
        role === "master_admin"
            ? [
                ...(selectedClinic && managementItem ? [managementItem] : []),
                ...profileByRole.master_admin,
            ]
            : profileByRole[role];

    return (
        <>
            <header className="relative z-30 w-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                {/* Main navigation */}
                <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between gap-3 px-5 lg:px-6">
                    <Link
                        href={getNavigationHref(
                            role === "master_admin"
                                ? "/"
                                : navigationByRole[role][0].href
                        )}
                        className="shrink-0 text-[29px] font-bold tracking-tight"
                    >
                        Samay<span className="text-violet-600">Q</span>
                    </Link>

                    <nav
                        aria-label="Main navigation"
                        className="hidden items-center gap-1 lg:flex"
                    >
                        {mainNavigation.map((item) => {
                            const active = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={getNavigationHref(item.href)}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex items-center whitespace-nowrap rounded-xl px-4 py-3 text-sm transition-colors ${
                                        active
                                            ? "bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white"
                                            : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                    }`}
                                >
                                    <span className="mr-2 text-violet-600">
                                        <Icon name={item.icon} size={18} />
                                    </span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            aria-label={
                                isDark
                                    ? "Switch to light theme"
                                    : "Switch to dark theme"
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {mounted ? (isDark ? "☾" : "☼") : "☼"}
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                aria-label="Open profile menu"
                                aria-expanded={profileOpen}
                                onClick={() => setProfileOpen((value) => !value)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <Icon name="account" size={21} />
                            </button>

                            {profileOpen && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Close profile menu"
                                        className="fixed inset-0 z-40 cursor-default"
                                        onClick={() => setProfileOpen(false)}
                                    />

                                    <div className="absolute right-0 top-11 z-50 w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                        <div className="border-b border-slate-200 px-3.5 py-3 dark:border-slate-700">
                                            <p className="text-sm text-slate-500">
                                                Hi,{" "}
                                                <span className="font-medium text-slate-900 dark:text-white">
                                                    {displayName ||
                                                        email?.split("@")[0] ||
                                                        "there"}
                                                </span>
                                            </p>

                                            {email && (
                                                <p className="mt-1 truncate text-xs text-slate-400">
                                                    {email}
                                                </p>
                                            )}
                                        </div>

                                        <nav
                                            aria-label="Profile menu"
                                            className="py-1"
                                        >
                                            {profileNavigation.map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={getNavigationHref(item.href)}
                                                    onClick={() => setProfileOpen(false)}
                                                    className="flex h-10 items-center gap-3 px-3.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <Icon name={item.icon} />
                                                    {item.label}
                                                </Link>
                                            ))}
                                        </nav>

                                        <div className="border-t border-slate-200 py-1 dark:border-slate-700">
                                            <button
                                                type="button"
                                                disabled={signingOut}
                                                onClick={handleSignOut}
                                                className="flex h-10 w-full items-center gap-3 px-3.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
                                            >
                                                <Icon name="signout" />
                                                {signingOut
                                                    ? "Signing out..."
                                                    : "Sign out"}
                                            </button>

                                            {signOutError && (
                                                <p
                                                    role="alert"
                                                    className="px-3.5 py-2 text-xs text-red-600"
                                                >
                                                    {signOutError}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <span className="hidden whitespace-nowrap rounded-xl bg-violet-50 px-3.5 py-3 text-xs font-semibold text-violet-700 sm:inline-flex dark:bg-violet-950 dark:text-violet-300">
                            {role === "master_admin"
                                ? "MASTER ADMIN"
                                : role.replace("_", " ").toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Clinic selector: Master Admin only */}
                {role === "master_admin" && (
                    <div className="w-full bg-white dark:bg-slate-950">
                        <div className="mx-auto flex min-h-[64px] w-full max-w-[1440px] items-center gap-3 px-5 py-2 lg:px-6">
                            <span className="flex shrink-0 items-center justify-center text-slate-500">
                                <Icon name="business" size={19} />
                            </span>

                            <div className="relative min-w-0 flex-1">
                                <button
                                    type="button"
                                    aria-label="Select clinic"
                                    aria-expanded={clinicsOpen}
                                    onClick={() => setClinicsOpen((open) => !open)}
                                    className="flex h-[46px] w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <span className="truncate text-sm font-medium">
                                        {selectedClinic
                                            ? `${selectedClinic.name}${selectedClinic.is_active ? "" : " (Inactive)"}`
                                            : "All clinics"}
                                    </span>

                                    <span className="ml-auto shrink-0 text-slate-500">
                                        {clinicsOpen ? "⌃" : "⌄"}
                                    </span>
                                </button>

                                {clinicsOpen && (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Close clinic dropdown"
                                            className="fixed inset-0 z-40 cursor-default"
                                            onClick={() => setClinicsOpen(false)}
                                        />

                                        <div className="absolute left-0 top-[52px] z-50 max-h-80 w-full min-w-[260px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                            <button
                                                type="button"
                                                onClick={() => selectClinic("")}
                                                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                                    !activeClinicId
                                                        ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                                        : ""
                                                }`}
                                            >
                                                All clinics
                                            </button>

                                            {clinicsLoading ? (
                                                <p className="px-3 py-3 text-sm text-slate-500">
                                                    Loading clinics...
                                                </p>
                                            ) : clinicsError ? (
                                                <p className="px-3 py-3 text-sm text-red-600">
                                                    {clinicsError}
                                                </p>
                                            ) : clinics.length === 0 ? (
                                                <p className="px-3 py-3 text-sm text-slate-500">
                                                    No clinics available.
                                                </p>
                                            ) : (
                                                clinics.map((clinic) => (
                                                    <button
                                                        key={clinic.id}
                                                        type="button"
                                                        onClick={() => selectClinic(clinic.id)}
                                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                                            activeClinicId === clinic.id
                                                                ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                                                : ""
                                                        }`}
                                                    >
                                                        <Icon name="business" size={17} />

                                                        <span className="min-w-0 flex-1 truncate">
                                                            {clinic.name}
                                                            {!clinic.is_active && (
                                                                <span className="ml-1 text-xs font-medium text-red-600 dark:text-red-400">
                                                                    (Inactive)
                                                                </span>
                                                            )}
                                                        </span>

                                                        {activeClinicId === clinic.id && (
                                                            <span aria-label="Selected">
                                                                ✓
                                                            </span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                className="hidden h-[46px] shrink-0 items-center border-r border-slate-200 px-3 text-sm text-slate-500 hover:text-violet-600 xl:flex dark:border-slate-700"
                            >
                                All locations
                            </button>

                            <button
                                type="button"
                                className="hidden h-[46px] shrink-0 items-center border-r border-slate-200 px-3 text-sm text-slate-500 hover:text-violet-600 xl:flex dark:border-slate-700"
                            >
                                All departments
                            </button>

                            <button
                                type="button"
                                onClick={() => setBusinessModalOpen(true)}
                                className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm hover:border-violet-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                            >
                                <span className="text-lg leading-none">+</span>
                                <span className="hidden sm:inline">
                                    Add Business
                                </span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <BusinessModal
                open={businessModalOpen}
                onClose={() => setBusinessModalOpen(false)}
            />
        </>
    );
}
