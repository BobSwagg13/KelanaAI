# RAG vs Base-Model: Answer Quality Comparison

This report compares answers from a Retrieval-Augmented Generation (RAG) pipeline against answers from the same model with no retrieval, to show what a curated knowledge base adds.

## Method

- **Generated:** 2026-09-01T17:22:52+00:00
- **Region:** ap-southeast-2
- **Knowledge base:** `EW7EM5BPON` (managed Bedrock KB; S3 data source `kelana-travel-docs`)
- **Model (both sides):** `amazon.nova-lite-v1:0`
- **RAG path:** `bedrock-agent-runtime.retrieve` (top 5 passages) then `bedrock-runtime.converse` with those passages prepended to the question. `retrieve_and_generate` is not offered for managed knowledge bases, so generation is done explicitly on this side.
- **Base path:** the same `converse` call with the bare question, no context.
- Same model, same inference config (`maxTokens=1024`, `temperature=0.7`) on both sides - retrieval is the only variable.

The knowledge base holds 10 documents: an official Japanese single-entry short-term-stay visa checklist (April 2025), Tokyo / Osaka / Kyoto travel guides, a Japan packing list, a North Korea guide (Koryo Tours, 2019), a Kazakhstan guide, an Indonesian-traveller payment / cross-border QRIS guide, and an Indonesia customs & IMEI registration guide. Each of the five questions targets a fact that lives in one of these documents.

---

## Q1. As an Indonesian traveller, how can I pay merchants abroad by scanning a QR code without exchanging cash? Which countries and local QR schemes support this, and which Indonesian apps can I use?

### RAG answer

As an Indonesian traveler, you can pay merchants abroad by scanning a QR code without exchanging cash using Cross-Border QRIS. Here are the countries and local QR schemes that support this, along with the Indonesian apps you can use:

1. **Thailand:** You can scan PromptPay QR codes. This is supported by major banks including Bangkok Bank, Kasikornbank, SCB, and Krungthai Bank.
2. **Malaysia:** You can scan DuitNow QR codes. This is supported across national retail stores, supermarkets, and dining outlets partnered with PayNet Malaysia.
3. **Singapore:** You can scan NETS QR or SGQR displaying the NETS logo. This is accepted across thousands of merchants, hawker centers, and retail stores island-wide.

You can use any Indonesian participating mobile banking app or licensed e-wallet such as BCA mobile/myBCA, Livin' by Mandiri, BRImo, BNI Mobile, GoPay, Dana, OVO, or ShopeePay to make these transactions. 

Here is how you transact using Cross-Border QRIS:
1. Open any Indonesian participating mobile banking app or licensed e-wallet.
2. Tap the Scan QR / QRIS button within the application.
3. Point your smartphone camera at the overseas merchant's local QR code (PromptPay in Thailand, DuitNow in Malaysia, NETS in Singapore).
4. Enter the required transaction amount in the local foreign currency.
5. The application will instantly display the real-time conversion into Indonesian Rupiah (IDR) based on competitive Bank Indonesia interbank exchange rates without extra markup.
6. Verify merchant name and amount, enter your transaction PIN, and the payment is completed.

### Passages retrieved from the knowledge base

- **indonesian-traveler-payment-guide.md** _(score 0.936)_
  > # International Payments, QRIS Cross-Border & Foreign Currency Guide for Indonesian Travelers **Bank Indonesia Cross-Border QRIS Interoperability:** Bank Indonesia (BI), in partnership with payment system associations (ASPI) and central banks across Southeast Asia and Asia-Pacific, has officially launched Cross-Border QRIS (QRIS Antarnegara). Indonesian travelers can make direct cashless payments 
- **indonesian-traveler-payment-guide.md** _(score 0.870)_
  > 4. Additional Networks: Bilateral payment connectivity and merchant testing are progressively rolling out with China (UnionPay / Alipay partnerships), Japan (JPQR Global integration), and South Korea. **How to Transact Using Cross-Border QRIS:** The payment workflow is seamless and requires no physical foreign currency exchange: 1. Open any Indonesian participating mobile banking app (such as BCA 
- **indonesian-traveler-payment-guide.md** _(score 0.660)_
  > **Benefits Over Traditional Currency Exchange:** - Zero Physical Cash Risk: Eliminates the risk of theft or counterfeit foreign banknotes. - Transparent Direct Exchange Rates: Conversions bypass predatory exchange margins frequently charged by airport currency exchange counters. - No Minimum Transaction Amount: Ideal for small purchases (such as street food, public transport tickets, or convenienc
- **indonesian-traveler-payment-guide.md** _(score 0.378)_
  > **Bank Indonesia Physical Cash and Currency Regulations:** Under Bank Indonesia Regulation No. 4/8/PBI/2002 concerning the Requirements and Procedures for Carrying Banknotes into or out of the Customs Territory of the Republic of Indonesia: - Carrying physical cash in Indonesian Rupiah or equivalent foreign currency amounting to Rp 100,000,000 (one hundred million IDR) or more requires mandatory w
- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.365)_
  > The code can be scanned using any smartphone camera or dedicated QR code reader application to access the encoded information. The QR code format allows for flexible data capacity, error correction, and reliable scanning even if partially obscured or printed at various sizes, making it ideal for travel guide applications where users may be scanning with various devices and in different lighting co

### Base-model answer (no retrieval)

As an Indonesian traveler, you have several options for paying merchants abroad using QR codes without needing to exchange cash. Here’s a detailed guide on countries, local QR schemes, and Indonesian apps you can use:

### Countries and Local QR Schemes

1. **Japan**
   - **QR Code Payment Systems:** Japan has several QR code payment systems supported by major banks and fintech companies. Some of the prominent ones include:
     - **PayPay**
     - **LINE Pay**
     - **Merpay (for Rakuten)**
     - **d払い (d payment)**
     - **au PAY**
     - **FamiPay**

2. **Singapore**
   - **QR Code Payment Systems:** Singapore has widely adopted QR code payments through various banks and fintech companies. Notable systems include:
     - **PayLah!**
     - **FavePay**
     - **GrabPay**
     - **Zingg by POSB**
     - **DBS PayLah!**

3. **Thailand**
   - **QR Code Payment Systems:** Thailand supports various QR code payment systems, including:
     - **TrueMoney Wallet**
     - **Krungsri Pay**
     - **Line Pay**
     - **Rabbit Line Pay**
     - **OCBC Tap & Go**

4. **South Korea**
   - **QR Code Payment Systems:** South Korea has popular QR code payment options such as:
     - **Kakao Pay**
     - **Naver Pay**
     - ** Toss Pay**

5. **Malaysia**
   - **QR Code Payment Systems:** Malaysia has several QR code payment systems:
     - **Touch ‘n Go eWallet**
     - **GrabPay**
     - **FamPay**
     - **Boost**

6. **Philippines**
   - **QR Code Payment Systems:** The Philippines has various QR code payment options:
     - **GCash**
     - **PayMaya**
     - **UnionPay QR**

### Indonesian Apps for QR Code Payments Abroad

Here are some Indonesian apps that support QR code payments and can be used abroad:

1. **OVO**
   - **Features:** OVO supports various international QR code payment systems. It’s integrated with global payment networks, making it easy to use in many countries.
   - **Supported Countries:** Japan, Singapore, Thailand, Malaysia, and others.

2. **GoPay**
   - **Features:** GoPay, linked to Gojek, offers a range of payment options including QR code payments.
   - **Supported Countries:** Available in Indonesia and expanding internationally.

3. **DANA**
   - **Features:** DANA offers QR code payments and is increasingly being accepted in various countries.
   - **Supported Countries:** Indonesia and some neighboring countries.

4. **LinkAja**
   - **Features:** This app is linked to the Indonesian state-owned banks and supports QR code payments.
   - **Supported Countries:** Primarily in Indonesia, but it’s expanding.

### Using Indonesian Apps Abroad

1. **Adding Funds:** Before you travel, ensure you have sufficient funds in your Indonesian app. Some apps may allow you to add funds via international bank transfers or other methods.

2. **International Use:** Check if the app supports international transactions. Most modern Indonesian fintech apps have this feature, but it’s always good to verify.

3. **Offline Mode:** Some apps offer an offline mode where you can pay using QR codes without an internet connection. This can be useful if you’re in areas with poor connectivity.

4. **Partnerships:** Many Indonesian apps have partnerships with international QR payment systems. Make sure to check the app’s website or contact customer support for a list of supported countries and schemes.

### Tips for Using QR Code Payments Abroad

- **Check Fees:** Be aware of any additional fees for international transactions.
- **Currency Conversion:** Understand the currency conversion rates to avoid any surprises.
- **Security:** Use secure devices and ensure your app has the latest security updates.
- **Backup Options:** Have a backup payment method in case your primary app doesn’t work in a particular country.

By using these apps and understanding the local QR code payment systems in the countries you visit, you can seamlessly pay for goods and services without needing to exchange cash.

### Analysis

RAG named the mechanism correctly (Cross-Border QRIS / QRIS Antarnegara), the three live corridors and their local schemes (PromptPay in Thailand, DuitNow in Malaysia, NETS/SGQR in Singapore), the correct participating apps (BCA mobile, Livin' by Mandiri, BRImo, BNI Mobile, GoPay, Dana, OVO, ShopeePay) and the real settlement path (Bank Indonesia interbank rate, no markup). It was conservative - it left out the China / Japan / South Korea rollout that a retrieved passage mentioned as 'progressively rolling out'. The base model fabricated a country-by-country table of unrelated domestic wallets (PayPay, Kakao Pay, Touch 'n Go, GCash...), implied Japan and Korea are already usable, invented international capabilities for OVO, and introduced LinkAja, which is not a listed participant. Confident, well-formatted, and materially wrong.

---

## Q2. I'm an Indonesian resident flying home with a new phone and a new laptop I bought overseas. What is the duty-free allowance, how many devices can I register for IMEI per arrival, and what taxes apply to the excess?

### RAG answer

Based on the reference passages:

1. **Duty-Free Allowance**:
   - The duty-free allowance for personal goods per passenger per arrival is up to USD 500. This is mentioned in passages [1], [2], and [3].

2. **IMEI Registration for Devices**:
   - Each traveler is permitted to register a maximum of two (2) devices per arrival. This information is provided in passage [1].

3. **Taxes on the Excess**:
   - If the device value exceeds USD 500 and is registered at the airport customs terminal before exiting the customs control area, the excess value above USD 500 is subject to:
     - **Import Duty (Bea Masuk)**: 10% of the customs value (nilai pabean).
     - **Value Added Tax (PPN)**: 11% of the import value.
   - These details are found in passage [1].

For your specific case of bringing a new phone and a new laptop:
- Both devices will be considered under your duty-free allowance of up to USD 500 if their combined value is USD 500 or less.
- If their combined value exceeds USD 500, you will need to register both devices at the airport customs terminal before exiting the customs control area to avoid losing the USD 500 exemption. The excess value above USD 500 will then be subject to the aforementioned import duty and VAT.

### Passages retrieved from the knowledge base

- **indonesia-customs-and-imei-guide.md** _(score 0.914)_
  > Non-personal goods (goods intended for commercial sale or entrusted by others) do not receive the USD 500 exemption and are taxed on full value. **IMEI Registration Rules for Purchased Smartphones, Handheld Computers, and Tablets:** International travelers bringing new mobile phones, tablets, or cellular devices purchased abroad into Indonesia must register the device IMEI numbers to access Indone
- **indonesia-customs-and-imei-guide.md** _(score 0.872)_
  > # Indonesia Customs & IMEI Registration Guide for International Travelers **Official Legal Basis:** Indonesian customs clearance for international passenger baggage is regulated under Minister of Finance Regulation (PMK) No. 203/PMK.04/2017 concerning the Export and Import of Goods Carried by Passengers, and Director General of Customs and Excise Regulation No. PER-13/BC/2021 jo. PER-7/BC/2023 reg
- **indonesia-customs-and-imei-guide.md** _(score 0.764)_
  > - Import Duty (Bea Masuk): 10% of customs value (nilai pabean). - Value Added Tax (PPN): 11% of import value. - Income Tax (PPh Pasal 22 Impor): 10% for passengers holding an active Indonesian Tax Identification Number (NPWP/NIK terintegrasi), or 20% for passengers without an NPWP. Registration carried out after exiting the airport customs area (within 60 days of arrival at a local customs office)
- **indonesia-customs-and-imei-guide.md** _(score 0.618)_
  > Per passenger of legal age (21 years or older), customs grants duty-free exemption for personal consumption up to: - Maximum 200 cigarettes, 25 cigars, or 100 grams of sliced tobacco. - Maximum 1 liter (1,000 ml) of alcoholic beverages. Any excess excise goods exceeding these limits will be seized and destroyed by customs officers on site. **Physical Cash and Currency Declaration Threshold:** Pass
- **indonesian-traveler-payment-guide.md** _(score 0.379)_
  > **Bank Indonesia Physical Cash and Currency Regulations:** Under Bank Indonesia Regulation No. 4/8/PBI/2002 concerning the Requirements and Procedures for Carrying Banknotes into or out of the Customs Territory of the Republic of Indonesia: - Carrying physical cash in Indonesian Rupiah or equivalent foreign currency amounting to Rp 100,000,000 (one hundred million IDR) or more requires mandatory w

### Base-model answer (no retrieval)

When traveling to Indonesia with new electronic devices such as a phone and a laptop, there are specific regulations and allowances you should be aware of regarding duty-free imports, IMEI registration, and applicable taxes. Here's a breakdown of what you need to know:

### Duty-Free Allowance
Indonesia has a duty-free allowance for personal belongings brought into the country. As of the latest information available, the duty-free limit for Indonesian residents returning from overseas is generally as follows:

- **General Items:** Duty-free up to a total value of approximately USD 500 (or equivalent in other currencies).
  
- **Specific to Electronics:** For electronics, this includes items like a laptop and a phone.

### IMEI Registration
In Indonesia, the authorities require the registration of the IMEI (International Mobile Equipment Identity) numbers for all new mobile devices. Here's what you need to know about IMEI registration:

- **One Device Per Arrival:** You are allowed to register up to one new mobile device per arrival into Indonesia. If you have more than one device, you will need to register each one separately if arriving on different occasions.

### Taxes on Excess Items
If your devices exceed the duty-free allowance or if you are bringing in more devices than the allowed limit, you will need to pay import taxes and potentially customs duties. The tax rates can vary but generally include:

- **Import Tax (PPN Import):** Typically around 5-10% of the value of the items.
  
- **Value-Added Tax (PPN MB):** This is usually around 10% of the total value (import tax + assessed value).

- **Customs Duties:** Depending on the specific type of electronic device, customs duties can range from 0% to 5%.

### Practical Steps
1. **Declare All Items:** When you arrive in Indonesia, declare all your electronic devices at customs. Ensure you have all purchase receipts and original packaging to prove the value and nature of the items.

2. **Register IMEI:** Within 30 days of arrival, register the IMEI numbers of your devices with the local authorities. Failure to register can result in fines or confiscation of the devices.

3. **Pay Taxes if Necessary:** If your devices exceed the duty-free limit, be prepared to pay the applicable taxes and duties at the customs office.

For the most accurate and up-to-date information, it's recommended to check with the Indonesian Customs and Excise office or visit their official website before your travel. Additionally, consulting with a local customs broker can help ensure compliance and smooth processing of your devices.

### Analysis

RAG gave the figures that matter: USD 500 FOB duty-free per passenger per arrival, a maximum of two devices for IMEI registration, and excess taxed at 10% import duty on customs value plus 11% VAT, with the exemption lost if you register after leaving the customs area. Its one gap: it omitted the PPh 22 income tax (10% with an NPWP, 20% without) that appeared in a retrieved passage. The base model was wrong on every number - 'one device per arrival' (actual: two), 'import tax typically 5-10%' and 'customs duties 0-5%' (actual: 10% + 11%), and a '30 days to register the IMEI' window that does not exist in the source.

---

## Q3. According to the Japanese government's official checklist, which documents must a tourist submit for a single-entry short-term-stay visa, and does that checklist apply to every nationality?

### RAG answer

According to the Japanese government's official checklist for a "Single-Entry Short-Term Stay Visa" in April 2025, the required documents include:

1. **Letter of guarantee (p.8)**
2. **Certified copy of the corporation register or Overview of company/organization (p.9)**
   - Not required if the company is listed on the stock exchange and submits its quarterly corporate report.
   - If the guarantor is an individual, a Certificate of employment can be submitted instead.
3. **Proof of funds of the guarantor (at least one of the following):**
   - Certificate of income (the previous year's gross income must be included) issued by the head of administration of the place of residence.
   - Tax return (Form 2) issued by the director of the tax office.
   - Balance certificate.
   - Certificate of residence (Juminhyo).
4. **Valid Passport**
5. **Visa application form**
6. **Photo**
7. **Flight itinerary** with the flight/ship number and date of arrival and departure to and from Japan.
8. **Income certificate** to prove the ability to pay travel expenses during the stay in Japan.

However, it is important to note that this checklist "does not apply to every nationality." Specifically, it does not apply to China, Russia, CIS Countries, Ukraine, Georgia, and the Philippines.

### Passages retrieved from the knowledge base

- **single-entry-short-term-visa-japan.pdf** _(score 0.597)_
  > April 2025 Checklist for "Single-Entry Short-Term Stay Visa" April 2025 for all nationalities except China, Russia, CIS Countries, Ukraine, Georgia, and the Philippines It is not permitted to perform any activities to undertake revenue-generating business operations or to receive remuneration in Japan. Purpose of Visit Short-Term Business Affairs, etc. Attending meetings/conferences, business comm

### Base-model answer (no retrieval)

When applying for a single-entry short-term-stay visa to Japan, the required documents generally include:

1. **Visa Application Form**: Properly filled out and signed.
2. **Passport**: Valid for at least six months beyond the intended period of stay, with at least two blank visa pages.
3. **Passport-sized Photographs**: Usually two recent passport-sized photos with a white background.
4. **Invitation Letter**: If applicable, from a host in Japan (such as an individual, company, or organization).
5. **Travel Itinerary**: A copy of round-trip flight reservations.
6. **Accommodation Proof**: Reservation confirmation for hotels, ryokans, or other accommodations.
7. **Financial Proof**: Evidence of sufficient funds to cover the stay (e.g., bank statements, credit card statements).
8. **Visa Fee**: Payment receipt for the visa application fee.

However, specific requirements can vary slightly depending on the nationality of the applicant and the purpose of the visit (tourism, business, visiting family, etc.). For instance, nationals from certain countries may need to provide additional documentation like employment verification, proof of marital status, or a detailed itinerary.

It is important to check the specific requirements on the official website of the Japanese Embassy or Consulate in your country, as they can provide the most accurate and detailed checklist tailored to your nationality and purpose of visit. The checklist is not universally identical for every nationality, as Japan may have specific requirements for certain countries based on bilateral agreements and historical context.

### Analysis

RAG reproduced the distinctive parts of the April 2025 checklist - the guarantor documents (letter of guarantee, certified corporation register or company overview, proof of guarantor funds via income certificate, tax return Form 2, balance certificate or Juminhyo), the flight itinerary with flight numbers and dates - and, importantly, that the checklist excludes China, Russia, CIS countries, Ukraine, Georgia and the Philippines. It did this from a single retrieved chunk (score 0.60). The base model produced a plausible generic tourist-visa list (photos, bank statements, hotel booking, visa fee) and correctly guessed that requirements vary by nationality, but for vague reasons and without naming the guarantor documents or the excluded countries. Caveat: the retrieved chunk mixes the checklist's purpose-of-visit columns, so RAG's document list leans guarantor-heavy for a pure tourist.

---

## Q4. If I take a private tour to North Korea with Koryo Tours, which items are prohibited from being brought into the country, and may I carry a printed guidebook about the DPRK?

### RAG answer

Based on the reference passages, the items prohibited from being brought into North Korea include:

- Religious materials
- Media of all kinds about Korea or in the Korean language
- Illicit drugs
- Pornography

Additionally, DPRK customs prohibit written materials, printed and electronic, about the DPRK from entry into the country. Therefore, you may not carry a printed guidebook about the DPRK.

### Passages retrieved from the knowledge base

- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.772)_
  > Like anywhere, the availability of services are subject to change based on local conditions and opening times. Please consult us for the most current information. Our private tours specialists are here to assist in creating the best possible itinerary based on your interests and requests. We regularly travel to the DPRK on a monthly basis with group tours and/or for site inspections. Important Ple
- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.742)_
  > The immediate purpose of the guide is to assist in planning your private tour to the DPRK. It may also be of interest to travelers on our group tours and those simply curious about this country. It is our suggestion that if you are interested in a private tour to the DPRK that you first have a look through this guide and use it to form a wish list of places you would like to visit. Our expert staf
- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.723)_
  > DPRK customs prohibits written materials, printed and electronic, about the DPRK from entry into the country. We hope you enjoy reading our introductory guide to travel in the DPRK. Koryo Tours, Beijing, 2018
- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.721)_
  > Important Please note this guide is not for use during travel in North Korea. North Korea customs prohibits written materials, printed and electronic, about the DPRK from entry into the country. INTRODUCTION Tolerant even towards its clichés, Korea greeted us with morning calm - Chris Marker in Coréennes, 1959 The Democratic People's Republic of Korea, the DPRK, North Korea, Choson, 'The Land of t
- **original-Koryo_Tours_North_Korea_Guide_2019.pdf** _(score 0.483)_
  > PAEKDU ATTRACTIONS & ACCOMODATION 61 THE NORTHEAST 64 CHONGJIN 65 MT. CHILBO 66 KYONGSONG 67 HOERYONG 69 RASON 70 4 THE PRIVATE TOUR Why go on a private tour? Our private independent tours are a great way to travel to North Korea if you want to have a more personal experience, fix your own dates, travel at your own pace or explore specific aspects of this fascinating and complex country. How do I 

### Base-model answer (no retrieval)

When traveling to North Korea with Koryo Tours or any other tour operator, it is crucial to be aware of the strict regulations regarding what items are prohibited from being brought into the country. Here are some general guidelines, although specific restrictions may change, so always check the most current information:

### Prohibited Items:
1. **Political Literature**: Any material deemed anti-state or critical of the North Korean government, including books, pamphlets, newspapers, magazines, and other printed materials.
2. **Religious Materials**: Bibles, crosses, and other religious artifacts are strictly prohibited.
3. **Pornographic Materials**: Any sexually explicit books, magazines, or films.
4. **Drugs and Contraband**: Illegal drugs and other contraband items are absolutely forbidden.
5. **Weapons**: Any form of weapon, including knives and even certain types of pepper spray.
6. **Cameras and Recording Devices**: While you may be allowed to bring a basic camera, advanced cameras, professional audio or video recording equipment, and any form of recording device (like a smartphone with video capabilities) are typically restricted or outright banned.
7. **Unauthorized Technology**: Some electronics, particularly those with internet capabilities or GPS, may be restricted.
8. **Personalized Items**: Items with personal inscriptions, especially those that could be seen as politically sensitive or critical.

### Allowed Items:
- **Basic Personal Items**: Clothing, toiletries, and basic medications (with prescriptions).
- **Printed Guidebooks**: Generally, printed guidebooks about North Korea are permitted as long as they are not politically subversive or critical of the state. However, it's always best to check with your tour operator or North Korean authorities to ensure the guidebook you wish to bring does not contain prohibited content.

### Carrying a Printed Guidebook:
A printed guidebook about the DPRK is usually allowed, provided it does not contain any content that is deemed politically subversive or critical of the North Korean government. The guidebook should be purely informative and factual, focusing on the history, culture, geography, and other non-controversial topics. However, it's always a good idea to confirm with your tour operator or the North Korean authorities before you travel to ensure compliance with the latest regulations.

### Final Tips:
- Always double-check the latest regulations with your tour operator before departure.
- Declare all items at customs and be prepared for inspections.
- Follow your guide's instructions and the rules set by your tour operator and North Korean authorities at all times.

Traveling to North Korea requires careful preparation and adherence to strict rules to ensure a safe and compliant visit.

### Analysis

The question turned on one specific point - may I carry a printed guidebook about the DPRK - and the two answers disagree. RAG, quoting the guide's own 'DPRK customs prohibits written materials, printed and electronic, about the DPRK from entry', said no, alongside religious materials, Korean-language media and illicit drugs. The base model gave a broader, plausible list (adding weapons and recording devices) but concluded that 'printed guidebooks about North Korea are generally permitted' as long as they are not politically critical - the opposite of what the source states. A confident base answer that is wrong on exactly the point asked.

---

## Q5. What is the estimated daily budget for a backpacker in Kyoto, broken down into accommodation, food, transport, and attractions?

### RAG answer

For a backpacker in Kyoto, the estimated daily budget is broken down as follows:

* **Accommodation:** $25 - $50 / night
* **Food:** $15 - $30 / day
* **Transport:** $5 - $8 / day
* **Attractions:** $10 - $15 / day

This information is sourced from the "Kyoto_Travel_Guide_EN.md" document under the section "ð??° 5. Cost Estimation: Budget to Luxury."

### Passages retrieved from the knowledge base

- **Kyoto_Travel_Guide_EN.md** _(score 0.835)_
  > ## ð??° 5. Cost Estimation: Budget to Luxury *Note: Prices are estimates per person and can vary based on season and exchange rates. (Prices estimated in USD).* ### ð??? Budget / Backpacker Style * **Accommodation:** $25 - $50 / night (Hostels, capsule hotels, or budget guesthouses). * **Food:** $15 - $30 / day (Convenience store breakfasts, noodle shops like Marugame Seimen, and Nishiki Market sn
- **Tokyo_Travel_Guide_EN.md** _(score 0.724)_
  > .* ### ð??? Budget / Backpacker Style * **Accommodation:** $30 - $60 / night (Capsule hotels, modern hostels, or budget business hotels in outer wards). * **Food:** $15 - $30 / day (Convenience store meals like 7-Eleven onigiri, Soba/Udon chains, gyudon bowls at Matsuya/Sukiya). * **Transport:** $6 - $12 / day (Basic Suica card rides on JR and subway lines). * **Attractions:** $10 - $20 total (Fre
- **Kyoto_Travel_Guide_EN.md** _(score 0.682)_
  > * **Accommodation:** $80 - $200 / night (Standard 3/4-star hotels, modern Machiya rentals, or entry-level Ryokans without meals). * **Food:** $50 - $100 / day (Casual Obanzai restaurants, nice cafes, and mid-range sushi or teppanyaki). * **Transport:** $10 - $15 / day (Subway + bus combination). * **Attractions:** $20 - $40 / day (Temple entrance fees, kimono rental for a few hours). ### ð??? Luxu
- **Osaka_Travel_Guide_EN.md** _(score 0.597)_
  > --- ## ð??° 5. Cost Estimation: Budget to Luxury *Note: Prices are estimates per person and can vary based on season and exchange rates. (Prices estimated in USD).* ### ð??? Budget / Backpacker Style *Perfect for travelers looking to save money without missing out on the core experience.* * **Accommodation:** $20 - $40 / night (Hostels, Capsule Hotels, or Guesthouses). * **Food:** $15 - $30 / day 
- **Kyoto_Travel_Guide_EN.md** _(score 0.417)_
  > * **Trains (JR, Keihan, Hankyu, Randen):** Great for reaching specific areas. JR is best for Arashiyama and Fushimi Inari. Keihan is excellent for the Higashiyama/Gion area. * **Recommended Travel Passes:** * **Subway & Bus 1-Day Pass:** Highly recommended to save money and seamlessly switch between the subway (to avoid traffic) and buses. * **ICOCA / Suica Card:** The standard tap-and-go IC card 

### Base-model answer (no retrieval)

Certainly! Here's a breakdown of an estimated daily budget for a backpacker in Kyoto, Japan, assuming a moderate level of comfort and experience:

### 1. **Accommodation**
- **Hostels/Budget Hotels:** ¥3,000 - ¥6,000 ($20 - $40)
- **Capsule Hotels:** ¥2,500 - ¥4,000 ($17 - $27)

### 2. **Food**
- **Street Food/Convenience Store Meals:** ¥1,000 - ¥2,000 ($7 - $14) per meal
  - A full meal at a local restaurant or izakaya can range from ¥1,000 - ¥3,000 ($7 - $20).
- **Snacks/Drinks:** ¥500 - ¥1,000 ($3 - $7)

**Total Daily Food Budget:** ¥3,500 - ¥6,000 ($24 - $40)

### 3. **Transport**
- **Public Transport (Buses, Subway):** ¥500 - ¥1,000 ($3 - $7) per day
  - A one-day pass for the subway and buses can cost around ¥600 ($4).
- **Taxis:** Not typically used for daily transport but useful for short distances.

**Total Daily Transport Budget:** ¥500 - ¥1,000 ($3 - $7)

### 4. **Attractions**
- **Temples/Shrines:** Many temples and shrines have small entry fees, typically ¥300 - ¥600 ($2 - $4).
- **Museums/Special Attractions:** ¥500 - ¥2,000 ($3 - $14) depending on the attraction.

**Total Daily Attractions Budget:** ¥500 - ¥2,500 ($3 - $17)

### **Summary of Daily Budget:**
- **Accommodation:** ¥3,000 - ¥6,000 ($20 - $40)
- **Food:** ¥3,500 - ¥6,000 ($24 - $40)
- **Transport:** ¥500 - ¥1,000 ($3 - $7)
- **Attractions:** ¥500 - ¥2,500 ($3 - $17)

**Total Estimated Daily Budget:** ¥7,500 - ¥15,500 ($50 - $108)

Of course, these are rough estimates, and your actual expenses may vary based on your preferences, travel style, and any special activities you might want to do. Enjoy your trip to Kyoto!

### Analysis

The weakest differentiator. RAG returned the guide's exact ranges (accommodation USD 25-50, food USD 15-30, transport USD 5-8, attractions USD 10-15 per day) with source attribution. The base model's estimate (lodging USD 20-40, transport USD 3-7, ~JPY 600 day pass, food USD 24-40) is close, arguably more practical - it breaks out yen and names the day pass - and overshoots only on food. Backpacker cost ranges are well represented in general training, so RAG's edge here is narrow: it matches 'the Kyoto guide' precisely and avoids the food overshoot. Retrieval also pulled Tokyo and Osaka budget chunks, which the model correctly ignored.

---

## Overall analysis

Hallucination versus omission. The base model consistently produced fuller, confident, well-formatted answers that carried fabricated specifics: an invented app/country table (Q1), a wrong IMEI device count and a nonexistent 30-day registration window (Q2), and a guidebook rule that is the opposite of the source (Q4). RAG erred the other way - terser, occasionally dropping a detail that was in the retrieved passages (the PPh 22 tax in Q2, the rollout countries in Q1) - but what it stated was traceable to a document.

Where RAG helped most: niche, codified, jurisdiction-specific facts - Indonesian cross-border-payment policy, Indonesian customs thresholds, a specific government visa checklist. These are exactly what a general model knows thinly or in blended, dated form.

Where RAG helped least: broad estimation questions the base model already covers well (Kyoto backpacker budget), where its answer was comparably useful and RAG's advantage shrank to exact-match-with-citation.

Retrieval quality bounded the result. Q3 succeeded on a single chunk (score 0.60); Q1 and Q5 pulled in off-topic chunks (a QR-code passage from the North Korea guide; Tokyo and Osaka budgets) that the model had to filter out itself. A re-ranking step would tighten this.

The model was held fixed (amazon.nova-lite-v1:0) with identical inference settings on both sides, so every difference above came from retrieved context, not a stronger model. For KelanaAI's domain - itinerary and logistics questions where correctness on visas, customs and payments matters - grounding the existing model in the knowledge base measurably improved factual accuracy and attached a citation to every claim, at the cost of occasionally terser answers. The base model should not be trusted for jurisdiction-specific numbers. Suggested next steps: add a re-ranker to drop off-topic chunks, and instruct the RAG prompt to carry every relevant figure from the retrieved passages through to the answer.

