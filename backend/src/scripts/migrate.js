const path = require('path')
const fs = require('fs')
const { sequelize } = require('../config/database')

/**
 * 数据库迁移执行脚本
 */
async function runMigrations() {
  try {
    console.log('开始执行数据库迁移...')
    
    // 确保数据库连接正常
    await sequelize.authenticate()
    console.log('数据库连接成功')

    // 获取迁移文件目录
    const migrationsDir = path.join(__dirname, '../migrations')
    
    // 检查迁移目录是否存在
    if (!fs.existsSync(migrationsDir)) {
      console.log('迁移目录不存在，跳过迁移')
      return
    }

    // 获取所有迁移文件
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort()

    console.log(`找到 ${migrationFiles.length} 个迁移文件`)

    // 执行迁移文件
    for (const file of migrationFiles) {
      console.log(`执行迁移: ${file}`)
      
      const migrationPath = path.join(migrationsDir, file)
      const migration = require(migrationPath)
      
      if (typeof migration.up === 'function') {
        await migration.up(sequelize)
        console.log(`迁移 ${file} 执行成功`)
      } else {
        console.warn(`迁移 ${file} 没有 up 方法，跳过`)
      }
    }

    console.log('所有迁移执行完成')
    
  } catch (error) {
    console.error('迁移执行失败:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

/**
 * 回滚迁移
 */
async function rollbackMigrations() {
  try {
    console.log('开始回滚数据库迁移...')
    
    await sequelize.authenticate()
    console.log('数据库连接成功')

    const migrationsDir = path.join(__dirname, '../migrations')
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('迁移目录不存在，无需回滚')
      return
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .reverse() // 逆序执行回滚

    console.log(`找到 ${migrationFiles.length} 个迁移文件，开始回滚`)

    for (const file of migrationFiles) {
      console.log(`回滚迁移: ${file}`)
      
      const migrationPath = path.join(migrationsDir, file)
      const migration = require(migrationPath)
      
      if (typeof migration.down === 'function') {
        await migration.down(sequelize)
        console.log(`迁移 ${file} 回滚成功`)
      } else {
        console.warn(`迁移 ${file} 没有 down 方法，跳过`)
      }
    }

    console.log('所有迁移回滚完成')
    
  } catch (error) {
    console.error('迁移回滚失败:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

/**
 * 强制同步模型（仅开发环境使用）
 */
async function forceSync() {
  try {
    console.log('开始强制同步数据库模型...')
    console.log('警告：这将删除所有数据！')
    
    // 导入所有模型
    require('../models/Availability')
    require('../models/BatchOperation')
    
    await sequelize.sync({ force: true })
    console.log('数据库模型强制同步完成')
    
  } catch (error) {
    console.error('强制同步失败:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

// 命令行参数处理
const command = process.argv[2]

switch (command) {
  case 'up':
    runMigrations()
    break
  case 'down':
    rollbackMigrations()
    break
  case 'force':
    forceSync()
    break
  default:
    console.log('使用方法:')
    console.log('  npm run migrate up    - 执行迁移')
    console.log('  npm run migrate down  - 回滚迁移')
    console.log('  npm run migrate force - 强制同步（仅开发环境）')
    process.exit(1)
}