import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("register/:trailId", "routes/register.tsx"),  
  // Clerk auth route - sign-in only, no sign-up
  route("sign-in", "routes/auth/sign-in.tsx"),
  
  // Group all admin routes under the layout
  layout("routes/admin/_layout.tsx" , [
    ...prefix("admin", [
      index("routes/admin/index.tsx"),
      route("trails", "routes/admin/trails.tsx"),
      route("trails/new", "routes/admin/trails-new.tsx"),
      route("trails/:trailId/edit", "routes/admin/trails-edit.tsx"),
      route("trails/:trailId/qr", "routes/admin/trails-qr.tsx"),
      route("templates", "routes/admin/templates.tsx"),
      route("data", "routes/admin/data.tsx"),
      route("statistics", "routes/admin/statistics.tsx"),
      route("get-token", "routes/admin/get-token.tsx"), // New route
    ]),
  ]),
] satisfies RouteConfig;
