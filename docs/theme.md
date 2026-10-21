# UI colour palette

The application uses the supplied cream/coral/forest reference. `apps/frontend/src/theme/colors.ts` is the source of brand colours and derived tones. `palette.ts` maps them to MUI; `AppProvider` exposes the same colours as CSS variables so native controls, charts and MUI dialogs stay consistent.

| Role | Reference colour |
|---|---|
| Main background | `#FFF9EF` |
| Cards / surfaces | `#FFFEFC` |
| Primary coral | `#FF6778` |
| Forest green | `#173F35` |
| Main text | `#171A17` |
| Muted / disabled | `#AAA69D` |
| Borders | `#D2C9BC` |
| Success | `#248A67` |
| Warning | `#E9A64A` |
| Error | `#D96B73` |

Derived soft fills and darker text tones come from these colour families. Main headings and sidebar use forest green. Coral accents appear on actions, active navigation and highlights. Small secondary text uses a darker warm neutral; the muted reference remains available for disabled and subtle elements. Coral buttons use dark text.

Use semantic CSS variables such as `--primary`, `--heading`, `--surface`, `--success` and `--line`, rather than adding hex literals in page styles. Status chips use success for present/approved, warning for late/pending, error for rejected and neutral for not checked in. A pending attendance record is not styled as a confirmed absence.

Attendance chart bars use success green. The breakdown uses green for on time, amber for late, coral for leave and a warm neutral for not checked in. The PWA colours and icon use the same palette.
