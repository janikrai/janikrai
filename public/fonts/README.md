# Licensed Fonts Directory

To enable the exact typefaces from the reference design, place your licensed webfont files here:

1. **Inferi Regular** (for main body text, navigation, project listings, and editorial copy):
   - `Inferi-Regular.woff2`
   - `Inferi-Regular.woff` (optional fallback)

2. **Waldenburg Halbfett** (for the centred director name and small uppercase section headings):
   - `Waldenburg-Halbfett.woff2`
   - `Waldenburg-Halbfett.woff` (optional fallback)

The application includes `@font-face` definitions mapped to these exact paths. Until the licensed files are placed in this directory, the website gracefully renders using the high-fidelity serif and grotesque fallback stacks.
