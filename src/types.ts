export type WidgetType = 'donut' | 'bar' | 'empty' | 'text'

export interface ChartDatum {
  label: string
  value: number
  color: string
}

export interface Widget {
  id: string
  name: string
  text: string
  /** How the widget body is drawn. Widgets created by the user default to 'text'. */
  type?: WidgetType
  /** Caption shown next to the total on bar widgets, for example "Total Images". */
  unit?: string
  data?: ChartDatum[]
  /** Hidden widgets stay in the category so they can be re-checked in the drawer. */
  hidden?: boolean
  /** True for widgets the user created, as opposed to ones that came from the JSON config. */
  custom?: boolean
}

export interface Category {
  id: string
  name: string
  /** Short label used for the category tab in the Add Widget drawer. */
  tabLabel: string
  widgets: Widget[]
}

export interface DashboardConfig {
  categories: Category[]
}
