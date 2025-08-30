const express = require('express')
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const { validate } = require('../middleware/validation')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: 用户认证相关接口
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 用户密码
 *                 example: password123
 *               remember:
 *                 type: boolean
 *                 description: 是否记住登录状态
 *                 default: false
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 登录成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT访问令牌
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 用户权限列表
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符'),
  validate
], authController.login)

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 用户密码
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: 用户姓名
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 注册成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符'),
  body('name')
    .isLength({ min: 2 })
    .withMessage('姓名至少2个字符')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的手机号码'),
  validate
], authController.protect, authController.restrictTo('admin'), authController.register)

// 员工自助注册路由
router.post('/self-register', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符'),
  body('name')
    .isLength({ min: 2 })
    .withMessage('姓名至少2个字符')
    .trim(),
  body('phone')
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的手机号码'),
  body('referrerEmail')
    .isEmail()
    .withMessage('请输入有效的推荐人邮箱地址')
    .normalizeEmail(),
  validate
], authController.selfRegister)

// 验证推荐人
router.post('/validate-referrer', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  validate
], authController.validateReferrer)

// 获取待审核的注册申请（管理员）
router.get('/pending-registrations', 
  authController.protect, 
  authController.restrictTo('admin'), 
  authController.getPendingRegistrations
)

// 审核注册申请（管理员）
router.post('/approve-registration/:id', [
  authController.protect,
  authController.restrictTo('admin'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('动作必须是 approve 或 reject'),
  body('reason')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('拒绝原因长度应在1-200字符之间'),
  validate
], authController.approveRegistration)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', authController.protect, authController.getMe)

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: 新的JWT访问令牌
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh', authController.protect, authController.refreshToken)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 用户退出登录
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 退出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 退出登录成功
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authController.protect, authController.logout)

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: 忘记密码
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱
 *     responses:
 *       200:
 *         description: 重置邮件发送成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码重置邮件已发送
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  validate
], authController.forgotPassword)

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: 重置令牌
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码重置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码重置成功
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('重置令牌不能为空'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符'),
  validate
], authController.resetPassword)

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: 修改密码
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 当前密码
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码修改成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码修改成功
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/change-password', [
  authController.protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少6个字符'),
  validate
], authController.changePassword)

module.exports = router