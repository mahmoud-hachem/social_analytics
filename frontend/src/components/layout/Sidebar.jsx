import {
    LayoutDashboard,
    MessageSquareText,
    ChartNoAxesCombined,
    Tags,
    Heart,
    ListChecks,
    FileText,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react"

import touchLogo from "../../assets/touch-logo.svg"


function Sidebar({
    collapsed,
    onToggle,
}) {
    const menuItems = [
        {
            label: "Overview",
            icon: LayoutDashboard,
            active: true,
        },
        {
            label: "Mentions",
            icon: MessageSquareText,
        },
        {
            label: "Analytics",
            icon: ChartNoAxesCombined,
        },
        {
            label: "Topics",
            icon: Tags,
        },
        {
            label: "Sentiment",
            icon: Heart,
        },
        {
            label: "Intents",
            icon: ListChecks,
        },
        {
            label: "Reports",
            icon: FileText,
        },
    ]


    return (
        <aside
            className={
                `sidebar ${
                    collapsed
                        ? "sidebar-collapsed"
                        : ""
                }`
            }
        >

            {!collapsed ? (
                <div className="sidebar-brand">

                    <div className="brand-left">

                        <img
                            src={touchLogo}
                            alt="Touch"
                            className="touch-logo"
                        />

                        <span className="brand-name">
                            TouchBoard
                        </span>

                    </div>


                    <button
                        className="sidebar-toggle"
                        onClick={onToggle}
                        aria-label="Collapse sidebar"
                        title="Close sidebar"
                    >
                        <PanelLeftClose size={21} />
                    </button>

                </div>
            ) : (
                 <div className="collapsed-header">

        <button
            className="collapsed-brand-button"
            onClick={onToggle}
            aria-label="Open sidebar"
            title="Open sidebar"
        >

            <img
                src={touchLogo}
                alt="Touch"
                className="collapsed-touch-logo"
            />

            <PanelLeftOpen
                className="collapsed-open-icon"
                size={22}
            />

        </button>

    </div>
)}


            <nav className="sidebar-nav">

                {menuItems.map((item) => {
                    const Icon = item.icon

                    return (
                        <button
                            key={item.label}
                            className={
                                `sidebar-item ${
                                    item.active
                                        ? "active"
                                        : ""
                                }`
                            }
                            title={
                                collapsed
                                    ? item.label
                                    : undefined
                            }
                        >

                            <Icon
                                className="sidebar-icon"
                                size={20}
                            />

                            {!collapsed && (
                                <span>
                                    {item.label}
                                </span>
                            )}

                        </button>
                    )
                })}

            </nav>

        </aside>
    )
}


export default Sidebar