"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return (
    <div style={{ height: "100%", backgroundColor: "#f5f5f5" }}>
      <SwaggerUI url="/api/docs" docExpansion="list" defaultModelsExpandDepth={-1} />
    </div>
  );
}
