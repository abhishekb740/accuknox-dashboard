import { expect, test, type Page } from '@playwright/test'

const CATEGORIES = ['CSPM Executive Dashboard', 'CWPP Dashboard', 'Registry Scan']
const WIDGETS = [
  'Cloud Accounts',
  'Cloud Account Risk Assessment',
  'Top 5 Namespace Specific Alerts',
  'Workload Alerts',
  'Image Risk Assessment',
  'Image Security Issues',
]

const section = (page: Page, name: string) => page.getByRole('region', { name, exact: true })
const widget = (page: Page, name: string) => page.getByRole('article', { name, exact: true })
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Add Widget' })
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search widgets' })

async function openDrawerFor(page: Page, category: string) {
  await page.getByRole('button', { name: `Add widget to ${category}` }).click()
  await expect(drawer(page)).toBeVisible()
}

async function removeWidget(page: Page, name: string) {
  await widget(page, name).hover()
  await page.getByRole('button', { name: `Remove ${name} widget` }).click()
}

async function createWidget(page: Page, category: string, name: string, text: string) {
  await openDrawerFor(page, category)
  await drawer(page).getByLabel('Widget name').fill(name)
  await drawer(page).getByLabel('Widget text').fill(text)
  await drawer(page).getByRole('button', { name: 'Add to list' }).click()
  await drawer(page).getByRole('button', { name: 'Confirm' }).click()
  await expect(drawer(page)).toHaveCount(0)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CNAPP Dashboard' })).toBeVisible()
})

test('renders the three categories and six widgets from the JSON config', async ({ page }) => {
  for (const name of CATEGORIES) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('article')).toHaveCount(6)
  for (const name of WIDGETS) {
    await expect(widget(page, name)).toBeVisible()
  }
  for (const name of CATEGORIES) {
    await expect(section(page, name).getByRole('article')).toHaveCount(2)
  }
})

test('removes a widget with its cross button', async ({ page }) => {
  await removeWidget(page, 'Cloud Accounts')

  await expect(widget(page, 'Cloud Accounts')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(5)

  // It stays listed in the drawer, unchecked, so it can be brought back.
  await openDrawerFor(page, 'CSPM Executive Dashboard')
  await expect(drawer(page).getByRole('checkbox', { name: 'Cloud Accounts' })).not.toBeChecked()
})

test('adds a widget from the drawer to the chosen category', async ({ page }) => {
  await openDrawerFor(page, 'Registry Scan')
  const panel = drawer(page)
  await expect(panel.getByRole('tab', { name: 'Image' })).toHaveAttribute('aria-selected', 'true')

  await panel.getByLabel('Widget name').fill('Base Image Drift')
  await panel.getByLabel('Widget text').fill('3 images run on a base layer older than 90 days.')
  await panel.getByRole('button', { name: 'Add to list' }).click()
  await expect(panel.getByText('New', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Confirm' }).click()

  await expect(drawer(page)).toHaveCount(0)
  const card = section(page, 'Registry Scan').getByRole('article', { name: 'Base Image Drift' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('3 images run on a base layer older than 90 days.')
  await expect(page.getByRole('article')).toHaveCount(7)
  await expect(section(page, 'CSPM Executive Dashboard').getByText('Base Image Drift')).toHaveCount(0)
})

test('shows a validation error when the new widget is incomplete', async ({ page }) => {
  await openDrawerFor(page, 'CWPP Dashboard')
  await drawer(page).getByLabel('Widget name').fill('Only a name')
  await drawer(page).getByRole('button', { name: 'Add to list' }).click()
  await expect(drawer(page).getByRole('alert')).toContainText('Enter both a widget name')
})

test('unchecking a widget in the drawer hides it and checking shows it again', async ({ page }) => {
  await openDrawerFor(page, 'CWPP Dashboard')
  await drawer(page).getByRole('checkbox', { name: 'Workload Alerts' }).uncheck()
  await drawer(page).getByRole('button', { name: 'Confirm' }).click()
  await expect(widget(page, 'Workload Alerts')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(5)

  await openDrawerFor(page, 'CWPP Dashboard')
  await drawer(page).getByRole('checkbox', { name: 'Workload Alerts' }).check()
  await drawer(page).getByRole('button', { name: 'Confirm' }).click()
  await expect(
    section(page, 'CWPP Dashboard').getByRole('article', { name: 'Workload Alerts' }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('Cancel discards every staged change', async ({ page }) => {
  await openDrawerFor(page, 'CSPM Executive Dashboard')
  const panel = drawer(page)
  await panel.getByRole('checkbox', { name: 'Cloud Accounts' }).uncheck()
  await panel.getByLabel('Widget name').fill('Discarded Widget')
  await panel.getByLabel('Widget text').fill('Should never appear.')
  await panel.getByRole('button', { name: 'Add to list' }).click()
  await panel.getByRole('button', { name: 'Cancel' }).click()

  await expect(drawer(page)).toHaveCount(0)
  await expect(widget(page, 'Cloud Accounts')).toBeVisible()
  await expect(page.getByText('Discarded Widget')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('searches by name and by text, shows the empty state and clears', async ({ page }) => {
  await search(page).fill('image')
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByText('2 widgets match')).toBeVisible()
  await expect(widget(page, 'Image Risk Assessment')).toBeVisible()
  await expect(widget(page, 'Image Security Issues')).toBeVisible()

  // "compliance checks" only appears in a widget's text, not in any name.
  await search(page).fill('compliance checks')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(widget(page, 'Cloud Account Risk Assessment')).toBeVisible()

  await search(page).fill('kubernetes')
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'No widgets match your search' })).toBeVisible()

  // The empty state has its own Clear search button below the search box one.
  await page.getByRole('button', { name: 'Clear search' }).last().click()
  await expect(search(page)).toHaveValue('')
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('keeps the layout across a reload', async ({ page }) => {
  await removeWidget(page, 'Image Security Issues')
  await createWidget(page, 'CWPP Dashboard', 'Runtime Policies', '12 syscalls blocked today.')
  await expect(widget(page, 'Runtime Policies')).toBeVisible()

  await page.reload()
  await expect(
    section(page, 'CWPP Dashboard').getByRole('article', { name: 'Runtime Policies' }),
  ).toBeVisible()
  await expect(widget(page, 'Image Security Issues')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(6)
})

test('Reset to default restores the JSON config', async ({ page }) => {
  await removeWidget(page, 'Cloud Accounts')
  await createWidget(page, 'CSPM Executive Dashboard', 'Temporary', 'Gone after reset.')
  await expect(widget(page, 'Temporary')).toBeVisible()

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Reset to default' }).click()

  await expect(widget(page, 'Temporary')).toHaveCount(0)
  await expect(widget(page, 'Cloud Accounts')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)

  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(6)
  await expect(widget(page, 'Temporary')).toHaveCount(0)
})

test('Escape closes the drawer and returns focus to the opener', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Add Widget', exact: true })
  await opener.click()
  await expect(drawer(page)).toBeVisible()
  await expect(drawer(page).getByRole('button', { name: 'Close' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(drawer(page)).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('stacks widgets in one column and opens a full-width drawer', async ({ page }) => {
    await expect(page.getByRole('article')).toHaveCount(6)
    const first = await widget(page, 'Cloud Accounts').boundingBox()
    const second = await widget(page, 'Cloud Account Risk Assessment').boundingBox()
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height)
    expect(second!.x).toBeCloseTo(first!.x, 0)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(390)

    await openDrawerFor(page, 'Registry Scan')
    const box = await drawer(page).boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(389)
    await drawer(page).getByRole('button', { name: 'Close' }).click()
    await expect(drawer(page)).toHaveCount(0)
  })
})
