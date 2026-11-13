# My Two Cents: bullets

Jack's raw points, one list per section. In Phase 5 Claude drafts paragraphs
from these into `content/sections/*.md`. Nothing gets added that isn't here;
gaps are marked `TODO(Jack)`.

Numbers: don't type them here. Say what you want to cite ("tuition since 2000",
"latest debt to GDP") and the draft will pull it from `data/facts.json`.

*Context:* sub-bullets are Claude's notes: supporting facts, data keys, and
claims to double-check. Delete any you don't want; the draft only uses the ones
left in.

## Intro (the hook)

- Economics is complicated. The only thing certain across its disciplines is that claims of *certainty* about what will happen are certainly wrong. What economics can do is work in *approximations*. It's not so much an engine for prediction as a backward-looking summary of observational data. From there, we can get rough ideas of what could or should happen if those circumstances arise again. This can, understandably, be highly confusing for anyone who hasn't dedicated significant time and energy to understanding not just what they're looking at in charts and figures, but what the takeaway is even meant to be. I myself found differential calculus incredibly hard. For some, statistics is their biggest academic villain.
- Part of what drew me to the subject as an undergrad was an odd split in opinion among my peers: some described the field as a lens that would change how I saw the modern world, and others accused it of being guesstimation and witchcraft, with no practical purpose for the average person carefully investing for retirement. Either way, both camps had one thing in common: they asked every econ grad they could find the same questions. What's going on with the economy? What do you think of (insert current event)? Does the debt even matter?
  - *Context:* those three questions map neatly onto the article (affordability and wealth, then the debt). Worth echoing one of them at the top of the debt section to close the loop.
- Conversation can only answer these so well, time and time again. I'm a visual learner, so I created this interactive article to share my broadest two cents on the US economy. The issues here are the ones I see as relevant to our time, observable in the data, and of concern to anyone at any level of participation in our civic system.
  - *Context:* a one-line roadmap would help readers here, e.g. "Four points: what's gotten unaffordable, who owns the wealth, what the debt really risks, and why the US is still the richest nation on earth."

## 1. The affordability gap

Thesis from the spec: core costs (housing, healthcare, tuition) outran wages and
overall inflation, while many goods got cheaper. It's a composition problem.

- Not everything has become unaffordable for the average household. But some of the most essential foundations of our way of life (housing, medicine, education) have. College tuition in particular has departed remarkably from our growth in wages. This gap between how much more we earn and how much more (or less) a basket of goods costs is what people feel today. One sector outpacing wages would show up as a single line on a household budget, but several sectors outpacing wages at once has an additive effect: workers and households feel a much smaller margin between earnings and expenses than in years gone by, or than previous generations had.
  - *Context:* since 1985, tuition (`tuition_pct_since_1985`), hospital services, medical care, rent and shelter all rose faster than median weekly earnings (`wages_pct_since_1985`). Overall CPI (`cpi_pct_since_1985`) rose *slower* than wages, so the average basket got slightly more affordable for the median full-time worker. That's the composition point: the squeeze comes from the essentials, not from everything.
  - *Context:* why the essentials are felt more: you can skip a new TV, but you can't skip rent or a hospital bill. The categories that got cheaper are mostly ones people can delay or do without; the ones that got pricier mostly aren't.
  - *Context:* Map 1 adds the geography: a typical home costs `price_to_income_lowest` years of income in `price_to_income_lowest_state` but `price_to_income_highest` in `price_to_income_highest_state`, and the typical US renter spends `us_rent_burden`% of income on rent. 30% is the usual line for "cost-burdened" (a HUD convention).

Counterpoint to name:
- Sectors synonymous with our tech-driven economy have, at the same time, gotten far cheaper than just a few decades ago. Staples such as TVs and personal computers are more affordable now than at any other point in time, and they're of much, much higher quality and complexity.
  - *Context:* TVs `tv_pct_since_1985`, computers `computers_pct_since_2000` (their series starts in 1997), phones `phones_pct_since_2000`.
  - *Context:* the quality point is built into the numbers. CPI prices the *same quality* of item over time, so much of a TV's −99% is "you get far more TV for the money," not a 99% lower sticker price. Worth one sentence so a skeptical reader doesn't think the chart claims TVs cost $5.
  - *Context:* "than at any other point in time" goes beyond the data, which starts in 1985 (1997 for computers). "Than at any point in the data" is safe.

## 2. Wealth concentration

Thesis from the spec: income stats understate the gap; asset ownership is where
concentration shows up.

- Thinking about wealth concentration is difficult because, very quickly, values associated with net worth move from barely understandable into the abstract zone. I can picture 10 hot dogs in my head. I cannot picture 1 million hot dogs. I certainly cannot picture 100 billion hot dogs.
  - *Context:* the new number line graphic (above Chart 2a) is built for this bullet: $10K to $100B on one plain line. If $10K sat 1 inch from $0, $100B would be about 158 miles away.
- We tend to think of a population where some have very little, others some, some others a lot, and a very few a whole, whole lot. That picture is quickly punctured by a concept called magnitude (greatness in size). When plotted on a number line, values separated by a factor of 10 get very far from each other very fast. Our current wealth distribution is a staggering display of magnitude, where most have extremely little of the total wealth, and a tiny few have most of the American pie.
  - *Context:* the top 10% hold `top10_share`% (about two-thirds), the top 1% `top1_share`%, and the bottom half `bottom50_share`% (`wealth_period`).
  - *Context:* the trend is the stronger point: since `wealth_first_period`, the top 1% went from `top1_share_first`% to `top1_share`%, while the bottom half went from `bottom50_share_first`% to `bottom50_share`%.
  - *Context:* the spec's thesis line ("income stats understate the gap") isn't in your bullets yet. One sentence would do it: income is what you earn this year; wealth is what you've accumulated, and it compounds.

Counterpoint to name:
- Part of the bottom half is simply young. Most people start adult life with little or even negative net worth and build it over decades, so some of this concentration is life stage, not class.
- These figures also don't count Social Security, which is the largest retirement asset for most middle- and lower-income households. Counting it would make the distribution look less concentrated, though still very unequal.

## 3. The debt and the dollar

Thesis from the spec: the debt matters, but not because the US "can't pay."
The risks are interest crowding out other spending, debt-ceiling default,
inflation pressure, and demand for Treasuries and the dollar.

- The national debt matters, but we can't think of it like a traditional loan. The US government borrows in a currency it issues itself, which would be akin to you promising someone $40K in 5 years, then materializing the money out of thin air when the bill comes due. There are absolutely levers we can pull to pay our debt obligations.
  - *Context:* I rewrote the analogy slightly. The original ("loans against itself… promising yourself 40k") implies the government owes the money to itself. Most of the debt is owed to outside investors, about `foreign_share`% of it to foreign ones (Chart 3c). What makes it unlike a household loan is that the debt is in dollars, which the US issues.
- A far more pressing issue is credit, and how it's perceived. Both have a great effect on the US economy and everyday commerce. The US can keep borrowing so long as people believe in its ability to pay them back, which is often called creditworthiness. Domestic and international lenders trust this process so much that they buy our Treasury bonds as "risk-free" assets in their own wealth strategies.
  - *Context:* the price of that trust is the interest rate. The 10-year Treasury yield was `yield_10y`% in `yield_10y_period` (Chart 3c).
  - *Context:* none of the three big rating agencies rates the US at the top grade any more: S&P downgraded it in 2011, Fitch in 2023, and Moody's in May 2025. This would need a citation in the methods footer; it isn't in the data pipeline.
- If we were to default on the debt, whether by political blunder or by real unaffordability (government revenue problems, ballooning interest, etc.), this trust could be destroyed. Investors would no longer want our bonds, which would decrease how much we can borrow, decrease how much of our government we can fund, and ultimately raise the cost of borrowing. Should we print money to service our debt, we'd risk inflation beyond what our system currently expects and tolerates (read about Germany after WWI).
  - *Context:* the "Can the US default?" box covers both routes (debt ceiling and inflation) and sits right after Chart 3c. This bullet can lean on it rather than repeat it.
  - *Context:* a nuance for Germany: much of its WWI reparations bill was owed in gold or foreign currency, not paper marks, which is exactly the trap the US avoids by borrowing in dollars. It's still the classic example of what printing your way out does to prices.
- Defense is often pointed to as one of our largest expenditures, and a frequent target for people who'd rather see that money go to social programs and the public interest. Our interest payments on the debt recently passed this figure, meaning we spend more on the cost of borrowing than on our entire military.
  - *Context:* net interest `net_interest_bn` billion vs. defense `defense_bn` billion (FY`omb_latest_year`); interest has been higher since FY`interest_above_defense_since` (Chart 3b).
  - *Context:* "entire military" is fair: OMB's national defense function covers the Defense Department plus nuclear weapons programs. Veterans' benefits are counted separately.
- In other words, we spend more on interest each year than the entire economy of Belgium, the 22nd-largest on Earth, produces. Only 21 countries have an economy bigger than our interest bill.
  - *Context:* computed by the pipeline (World Bank total GDP, `gdp_size_year`): `interest_beats_country` (#`interest_beats_rank`, `interest_beats_gdp_bn` billion) is the largest economy smaller than net interest; `countries_bigger_than_interest` countries are bigger. Your ranking was right; "as much as" became "more than", since Belgium's GDP is smaller than the interest bill.

Counterpoint to name:
- While scary, it's important to remember that this debt is backed by the largest Western economy and the most valuable business sector on Earth. We are on a mathematical trajectory toward debt problems, but we still have time to make informed adjustments to how our government borrows and spends, and bring this issue to a manageable level.
  - *Context:* changed "one of the largest western economies by population" to "the largest Western economy". The US is the largest outright, and third in the world by population.
  - *Context:* the trajectory, in numbers: debt held by the public is `debt_gdp_latest`% of GDP (FY`debt_gdp_latest_year`). CBO projects it passes the post-WWII record (`debt_gdp_peak`% in `debt_gdp_peak_year`) in `cbo_passes_peak_year` and reaches `cbo_debt_gdp_end`% by `cbo_debt_gdp_end_year`.

## 4. Still the richest nation on earth

Thesis from the spec: the optimistic closer. Huge resources and opportunity; the
US poor are better off than the global poor in absolute terms. Then the caveat.

- The US has a fantastic amount of wealth. With a nominal GDP of about $`us_gdp_tn` trillion (`us_gdp_period`, annual rate), the US has been the world's largest economy since the late 1800s. Per person, it's the richest country of any real size. We have an incredibly diverse economy: we lead in finance, technology, and healthcare, and remain a manufacturing heavyweight.
  - *Context:* "fantastical" means imaginary, so it became "fantastic". "Richest economy" became "largest", since that's what total GDP measures.
  - *Context:* per person, the US ranks #`us_gdp_rank` of `gdp_rank_count` countries (`us_gdp_pc` PPP dollars, `gdp_rank_year`), behind small places like Luxembourg and Singapore, and #`us_gdp_rank_pop10m` among countries with 10 million or more people. That's a strong, defensible version of "richest".
  - *Context:* GDP now comes from FRED (`us_gdp_tn`, `us_gdp_period`). "Largest" holds at market exchange rates; adjusted for local prices (PPP), China's total GDP passed the US's around 2016.
- The dollar is the global reserve currency and the medium of exchange in most international trade, which creates unique and unparalleled demand for our money.
  - *Context:* the dollar is about 58% of the world's disclosed foreign-exchange reserves (IMF COFER) and on one side of about 88% of currency trades (BIS Triennial Survey, 2022). Both would need citations; they aren't in the pipeline. This is also why foreign buyers hold so many Treasuries (Chart 3c).
- We maintain one of the highest levels of human capital in the world, with heavy investment in cutting-edge research and science. Most of the world's top universities are American, and many of their graduates, including international students, stay to support the US economy through employment and business ventures.
  - *Context:* "most of the top universities" depends on the ranking: most of the top 10 in Times Higher Education's list, but closer to half in QS's. "Many of the world's top universities" is safe under any ranking.
- American geography is awesome. Our land is so large and diverse that we effectively have a continent-sized free-trade area, where resources and people can move freely.
  - *Context:* two more geography points if you want them: the Mississippi river system is the world's largest network of navigable inland waterways, and the US is the world's largest producer of both oil and natural gas (EIA).

Counterpoint to name:
- In the aggregate, America is very well off. Our poorest are far better off than the global poor. But compared with our developed Western peers, more of our households fall well behind the typical one.
  - *Context:* (moved from the closing.) Chart 4a: the US relative poverty rate is `us_relative_poverty`% (`us_relative_poverty_year`), #`us_relative_poverty_rank` of `oecd_count` OECD countries, against an OECD median of `oecd_median_relative_poverty`%. Only `us_poverty_3usd`% of Americans live below the global extreme-poverty line (`poverty_line`). "Healthcare" was dropped from this point, since the data here doesn't cover it.

## Closing (ties the four together)

- All things considered, the picture becomes much more colorful than a black-and-white "we're doomed" scenario. Yes, many people in the US are experiencing real hardship brought on by these specific economic conditions. But those forces are constantly being countered by the incredible opportunities and systems at our disposal. Even so, the average American faces a market where housing, healthcare, and education take a measurably bigger bite than they did for their parents, or even their grandparents.
  - *Context:* backed by Chart 1a: since 1985, tuition, hospital services, medical care, rent and shelter all outpaced wages.
