const swaggerJSDoc = require('swagger-jsdoc')

// Swagger定义
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '排班管理系统 API',
    version: '1.0.0',
    description: '智能排班管理系统的RESTful API文档',
    contact: {
      name: 'Schedule System Team',
      email: 'support@schedule-system.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: '开发环境'
    },
    {
      url: 'https://api.schedule-system.com/api',
      description: '生产环境'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authorization header using the Bearer scheme'
      }
    },
    schemas: {
      // 通用响应格式
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: '请求是否成功'
          },
          message: {
            type: 'string',
            description: '响应消息'
          },
          data: {
            type: 'object',
            description: '响应数据'
          }
        }
      },
      
      // 错误响应格式
      ErrorResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '错误状态',
            enum: ['error', 'fail']
          },
          message: {
            type: 'string',
            description: '错误消息'
          },
          code: {
            type: 'string',
            description: '错误代码'
          }
        }
      },
      
      // 分页响应格式
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean'
          },
          data: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: '当前页码'
              },
              limit: {
                type: 'integer',
                description: '每页数量'
              },
              total: {
                type: 'integer',
                description: '总记录数'
              },
              totalPages: {
                type: 'integer',
                description: '总页数'
              }
            }
          }
        }
      },
      
      // 用户模型
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '用户ID'
          },
          email: {
            type: 'string',
            format: 'email',
            description: '用户邮箱'
          },
          name: {
            type: 'string',
            description: '用户名'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'employee'],
            description: '用户角色'
          }
        }
      },
      
      // 员工模型
      Employee: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '员工ID'
          },
          employee_no: {
            type: 'string',
            description: '员工编号'
          },
          name: {
            type: 'string',
            description: '员工姓名'
          },
          email: {
            type: 'string',
            format: 'email',
            description: '员工邮箱'
          },
          phone: {
            type: 'string',
            description: '手机号码'
          },
          department_id: {
            type: 'integer',
            description: '部门ID'
          },
          position: {
            type: 'string',
            description: '角色'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'leave'],
            description: '员工状态'
          }
        }
      },
      
      // 部门模型
      Department: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '部门ID'
          },
          name: {
            type: 'string',
            description: '部门名称'
          },
          description: {
            type: 'string',
            description: '部门描述'
          },
          manager_id: {
            type: 'integer',
            description: '部门经理ID'
          }
        }
      },
      
      // 时间段模型
      TimeSlot: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '时间段ID'
          },
          name: {
            type: 'string',
            description: '时间段名称'
          },
          day_of_week: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            description: '星期几 (1-7)'
          },
          start_time: {
            type: 'string',
            format: 'time',
            description: '开始时间'
          },
          end_time: {
            type: 'string',
            format: 'time',
            description: '结束时间'
          },
          required_people: {
            type: 'integer',
            description: '需要人数'
          }
        }
      },
      
      // 排班结果模型
      Schedule: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '排班ID'
          },
          employee_id: {
            type: 'integer',
            description: '员工ID'
          },
          time_slot_id: {
            type: 'integer',
            description: '时间段ID'
          },
          schedule_date: {
            type: 'string',
            format: 'date',
            description: '排班日期'
          },
          status: {
            type: 'string',
            enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
            description: '排班状态'
          }
        }
      },
      
      // 调班申请模型
      ShiftRequest: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: '申请ID'
          },
          requester_id: {
            type: 'integer',
            description: '申请人ID'
          },
          original_schedule_id: {
            type: 'integer',
            description: '原排班记录ID'
          },
          request_type: {
            type: 'string',
            enum: ['swap', 'transfer', 'cancel'],
            description: '申请类型'
          },
          reason: {
            type: 'string',
            description: '申请原因'
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            description: '申请状态'
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
}

// Swagger选项
const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
}

// 生成Swagger规范
const swaggerSpec = swaggerJSDoc(options)

module.exports = swaggerSpec