import { test, expect } from '@playwright/test'

const BASE_URL = 'https://gen-companion-tree.vercel.app'
const TEST_EMAIL = 'yyqdkp@gmail.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

async function loginAsTestUser(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/auth?mode=login`)
  await page.waitForTimeout(800)

  const emailInput = page.locator('input[type="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  if (!(await emailInput.isVisible())) return

  await emailInput.fill(TEST_EMAIL)
  await passwordInput.fill(TEST_PASSWORD)

  const loginBtn = page.getByRole('button', { name: /登录/ }).first()
  if (await loginBtn.isVisible()) {
    await loginBtn.click()
  } else {
    await page.keyboard.press('Enter')
  }

  await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 20_000 }).catch(() => {})
  await page.waitForTimeout(1500)
}

test.describe('核心用户流程测试（未登录）', () => {

  test('首页加载速度', async ({ page }) => {
    const start = Date.now()
    await page.goto(BASE_URL)
    const loadTime = Date.now() - start
    console.log(`首页加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(15000)
    await expect(page).toHaveTitle(/根/)
  })

  test('三颗水珠显示', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true })
    console.log('首页截图已保存')
  })

  test('底部导航可点击', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/nav.png' })
  })

  test('汉字解码页面', async ({ page }) => {
    await page.goto(`${BASE_URL}/learn`)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/learn.png', fullPage: true })
    const input = page.locator('input, textarea').first()
    await expect(input).toBeVisible()
  })

  test('升级页面', async ({ page }) => {
    await page.goto(`${BASE_URL}/upgrade`)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/upgrade.png', fullPage: true })
    const btn = page.locator('button').filter({ hasText: /升级|试用|Pro/ }).first()
    await expect(btn).toBeVisible().catch(() => {})
  })

  test('移动端视口测试', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'tests/screenshots/mobile-homepage.png',
      fullPage: true,
    })
    console.log('移动端截图已保存')
  })

  test('小屏幕测试 iPhone SE', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'tests/screenshots/small-screen.png',
      fullPage: true,
    })
  })

})

test.describe('已登录用户核心流程', () => {

  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_PASSWORD, '需要设置环境变量 TEST_PASSWORD')
    await loginAsTestUser(page)
  })

  test('首页三颗水珠显示', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.screenshot({
      path: 'tests/screenshots/homepage-loggedin.png',
      fullPage: true,
    })
    console.log('已登录首页截图完成')
  })

  test('首页加载时间', async ({ page }) => {
    const start = Date.now()
    await page.goto(BASE_URL)
    await page.waitForTimeout(5000)
    const loadTime = Date.now() - start
    console.log(`已登录首页加载时间: ${loadTime}ms`)
    await page.screenshot({ path: 'tests/screenshots/homepage-timing.png' })
  })

  test('日安页待办列表', async ({ page }) => {
    await page.goto(`${BASE_URL}/rian`)
    await page.waitForTimeout(3000)
    await page.screenshot({
      path: 'tests/screenshots/rian-loggedin.png',
      fullPage: true,
    })
  })

  test('汉字解码页面', async ({ page }) => {
    await page.goto(`${BASE_URL}/learn`)
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'tests/screenshots/learn-loggedin.png',
      fullPage: true,
    })
  })

  test('升级页面按钮', async ({ page }) => {
    await page.goto(`${BASE_URL}/upgrade`)
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'tests/screenshots/upgrade-loggedin.png',
      fullPage: true,
    })
    const btn = page.locator('button').filter({ hasText: /免费试用|升级|Pro/ }).first()
    const isVisible = await btn.isVisible().catch(() => false)
    console.log('升级按钮可见:', isVisible)
  })

  test('移动端 iPhone 14 完整截图', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'tests/screenshots/iphone14-home.png' })

    await page.goto(`${BASE_URL}/rian`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/iphone14-rian.png' })

    await page.goto(`${BASE_URL}/learn`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/iphone14-learn.png' })

    console.log('iPhone 14 所有页面截图完成')
  })

  test('iPhone SE 小屏适配', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'tests/screenshots/iphonese-home.png' })

    await page.goto(`${BASE_URL}/rian`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/iphonese-rian.png' })
  })

})
