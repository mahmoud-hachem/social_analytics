import {
    useState,
} from "react"

import DashboardLayout
    from "./components/layout/DashboardLayout"

import Overview
    from "./pages/Overview"

import DataCollection
    from "./pages/DataCollection"

import Comments
    from "./pages/Contents"

import Analytics
    from "./pages/Analytics"

import AIInsights
    from "./pages/AIInsights"


function App() {
    const [
        activePage,
        setActivePage,
    ] = useState("overview")


    function renderPage() {

        if (
            activePage === "collection"
        ) {
            return (
                <DataCollection
                    onOpenContent={() => {
                        setActivePage(
                            "comments"
                        )
                    }}
                />
            )
        }


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


        if (
            activePage === "insights"
        ) {
            return <AIInsights />
        }


        return <Overview />
    }


    return (
        <DashboardLayout
            activePage={activePage}
            onPageChange={
                setActivePage
            }
        >
            {renderPage()}
        </DashboardLayout>
    )
}


export default App