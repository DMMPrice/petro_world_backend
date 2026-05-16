import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PetroWorld API',
      version: '1.0.0',
      description: 'REST API for PetroWorld petroleum e-commerce platform',
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Admin', description: 'Admin-only CRUD endpoints' },
    ],
    servers: [{ url: 'http://localhost:3002/api/v1', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            brand_name: { type: 'string' },
            price: { type: 'number' },
            price_after_discount: { type: 'number', nullable: true },
            description: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            stock_quantity: { type: 'integer' },
            rating: { type: 'number' },
            num_reviews: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            icon: { type: 'string' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            status: {
              type: 'string',
              enum: ['ordered', 'shipped', 'delivered', 'canceled', 'returned'],
            },
            total_amount: { type: 'number' },
            payment_method: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            address_line1: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            is_default: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalProducts: { type: 'integer' },
            totalCustomers: { type: 'integer' },
            totalOrders: { type: 'integer' },
            totalRevenue: { type: 'number' },
            ordersByStatus: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
          },
        },
        DeliveryEstimate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pincode_prefix: { type: 'string' },
            min_days: { type: 'integer' },
            max_days: { type: 'integer' },
            description: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
