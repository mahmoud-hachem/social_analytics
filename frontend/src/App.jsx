import {
    useState,
} from "react"

import DashboardLayout
    from "./components/layout/DashboardLayout"

import Overview
    from "./pages/Overview"

import Comments
    from "./pages/Contents"

import Analytics
    from "./pages/Analytics"


function App() {
    const [
        activePage,
        setActivePage,
    ] = useState("overview")


    function renderPage() {
    if (
        activePage === "comments"
    ) {
        return <Comments />
    }

    if (
        activePage === "analytics"
    ) {
        return <Analytics />
    }

    return <Overview />
}


    return (
        <DashboardLayout
            activePage={activePage}
            onPageChange={setActivePage}
        >
            {renderPage()}
        </DashboardLayout>
    )
}


export default App