import type { ScheduleApi } from '../shared/api'

declare global {
  interface Window {
    appApi: ScheduleApi
  }
}