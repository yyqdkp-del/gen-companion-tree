import { test, expect, chromium } from '@playwright/test'

const BASE_URL = 'https://gen-companion-tree.vercel.app'
const EMAIL = 'yyqdkp@gmail.com'
const PASSWORD = process.env.TEST_PASSWORD || ''

test.describe('根陪伴 Browser Automation 完整测试', () => {

  test('完整用户流程', async () => {
    test.skip(!PASSWORD, '需要设置环境变量 TEST_PASSWORD')

    const browser = await chromium.launch({
      headless: process.env.PW_HEADED !== '1',
      slowMo: 500,
    })

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      recordVideo: { dir: 'tests/videos/' },
    })

    const page = await context.newPage()

    try {
      console.log('1. 打开登录页...')
      await page.goto(`${BASE_URL}/auth?mode=login`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/01-login.png' })

      const emailInput = page.locator('input[type="email"]').first()
      if (await emailInput.isVisible()) {
        await emailInput.fill(EMAIL)
        const passwordInput = page.locator('input[type="password"]').first()
        await passwordInput.fill(PASSWORD)
        await page.screenshot({ path: 'tests/screenshots/02-login-filled.png' })

        const loginBtn = page.getByRole('button', { name: /登录/ }).first()
        if (await loginBtn.isVisible()) {
          await loginBtn.click()
        } else {
          await page.keyboard.press('Enter')
        }
        await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 20_000 }).catch(() => {})
        await page.waitForTimeout(3000)
      }

      console.log('2. 检查首页三颗水珠...')
      await page.goto(BASE_URL)
      await page.waitForTimeout(4000)
      await page.screenshot({ path: 'tests/screenshots/03-homepage.png', fullPage: true })

      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domLoad: Math.round(nav.domContentLoadedEventEnd),
          fullLoad: Math.round(nav.loadEventEnd),
        }
      })
      console.log(`首页加载: DOM ${timing.domLoad}ms, 完整 ${timing.fullLoad}ms`)

      console.log('3. 测试水珠点击...')
      await page.mouse.click(195, 400)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: 'tests/screenshots/04-waterdrop-click.png', fullPage: true })

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      console.log('4. 测试日安页...')
      await page.goto(`${BASE_URL}/rian`)
      await page.waitForTimeout(3000)
      await page.screenshot({ path: 'tests/screenshots/05-rian.png', fullPage: true })

      const input = page.locator('input[placeholder], textarea[placeholder]').last()
      if (await input.isVisible()) {
        await input.click()
        await page.waitForTimeout(500)
        await input.fill('明天带孩子去看牙医')
        await page.screenshot({ path: 'tests/screenshots/06-rian-input.png' })
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'tests/screenshots/07-rian-submitted.png', fullPage: true })
      }

      console.log('5. 测试汉字解码...')
      await page.goto(`${BASE_URL}/learn`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/08-learn.png', fullPage: true })

      const learnInput = page.locator('input').first()
      if (await learnInput.isVisible()) {
        await learnInput.fill('家')
        await page.waitForTimeout(500)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(5000)
        await page.screenshot({ path: 'tests/screenshots/09-learn-result.png', fullPage: true })
      }

      console.log('6. 测试木棉树洞...')
      await page.goto(`${BASE_URL}/treehouse`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/10-treehouse.png', fullPage: true })

      console.log('7. 测试升级页...')
      await page.goto(`${BASE_URL}/upgrade`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/11-upgrade.png', fullPage: true })

      const upgradeBtn = page.locator('button').filter({ hasText: /试用|升级|Pro/ }).first()
      const btnVisible = await upgradeBtn.isVisible().catch(() => false)
      console.log(`升级按钮可见: ${btnVisible}`)

      console.log('8. 测试 iPhone SE 小屏...')
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(BASE_URL)
      await page.waitForTimeout(3000)
      await page.screenshot({ path: 'tests/screenshots/12-iphonese.png', fullPage: true })

      console.log('9. 测试档案页...')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${BASE_URL}/profile`)
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/13-profile.png', fullPage: true })

      console.log('✅ 所有测试完成，截图已保存到 tests/screenshots/')
      expect(timing.fullLoad).toBeGreaterThan(0)
    } finally {
      await context.close()
      await browser.close()
    }
  })

})
