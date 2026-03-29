import { createBrowserRouter } from "react-router";
import { DiscussionList } from "./components/DiscussionList";
import { DiscussionMonitor } from "./components/DiscussionMonitor";
import { StudentView } from "./components/StudentView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DiscussionList,
  },
  {
    path: "/discussion/:id",
    Component: DiscussionMonitor,
  },
  {
    path: "/join/:code",
    Component: StudentView,
  },
]);
