import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Esignature API Documentation",
    version: "1.0.0",
    description: "Swagger docs for Esignature API",
  },
  servers: [
    {
      url: "http://localhost:3011", 
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [path.resolve(process.cwd(), "src/app/api/**/*.ts")],
};

export const swaggerSpec = swaggerJSDoc(options);
