# Mock Lizard

A small JavaScript app for generating mock API JSON payloads from a sample object.

Open `index.html` in a browser, paste a sample JSON object, choose a record count and output shape, then generate repeatable mock data.

For logo, color, versioning, and publishing details, see [BRAND_AND_DEPLOYMENT.md](BRAND_AND_DEPLOYMENT.md).

## Features

- Infer a mock-data shape from sample JSON.
- Generate single objects, arrays, or paginated API responses.
- Preserve nested objects, arrays, primitive types, and null fields.
- Use field-name hints for IDs, names, emails, statuses, roles, dates, money, counts, and companies.
- Preserve numeric strings such as contract and policy numbers.
- Override field formats with `#` for digits and `?` for uppercase letters.
- Use a seed for repeatable mock output.
- Copy or save generated JSON.

## Custom Formats

Use the `Formats` box for fields that need a specific shape:

```text
contractNumber=#######
policyNumber=POL-#######
claimNumber=CLM-??-####
```

Format tokens:

- `#` generates a digit.
- `?` generates an uppercase letter.
- Other characters are copied as-is.

## GitHub Pages

Suggested live URL:

```text
https://davidbreyer.github.io/mock-lizard/
```

Suggested deployment flow:

```powershell
git add -- ...
git commit -m "Some change"
git push origin master
git push origin master:gh-pages
```

`master` stores the source/history. `gh-pages` is the branch GitHub Pages serves publicly.
