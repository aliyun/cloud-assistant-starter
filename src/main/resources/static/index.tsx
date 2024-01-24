import * as React from "react";
import {createRoot} from "react-dom/client";
import {createBrowserRouter, RouterProvider,} from "react-router-dom";
import Primary from "./components/Primary";
import EcsInstances from "./components/resource/EcsInstances";
import AmiInstances from "./components/resource/AmiInstances";
import SwasInstances from "./components/resource/SwasInstances";
import TaskManager from "./components/resource/TaskManager";
import AxtSession from "./components/session/AxtSession";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Primary/>,
        errorElement: <Primary/>,
        children: [
            {
                path: "/",
                element: <EcsInstances/>
            },
            {
                path: "ecs",
                element: <EcsInstances/>
            },
            {
                path: "ami",
                element: <AmiInstances/>
            },
            {
                path: "swas",
                element: <SwasInstances/>
            },
            {
                path: "task",
                element: <TaskManager/>
            }
        ]
    },
    {
        path: "/session/axt",
        element: <AxtSession/>
    }
]);

// @ts-ignore
const container = document.getElementById("primary");
const root = createRoot(container); //.render(<Primary/>);
root.render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>
)