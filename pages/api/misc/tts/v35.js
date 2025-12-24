import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class LoveVoiceClient {
  constructor() {
    this.baseURL = "https://lovevoice.ai";
    this.cfSiteKey = "0x4AAAAAABARovuA2Qj0mtMA";
    this.cfURL = "https://lovevoice.ai/";
    this.voiceCache = null;
  }
  async getCfToken() {
    try {
      console.log("[LoveVoice] Getting Cloudflare token...");
      const cfURL = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token?mode=turnstile-min&sitekey=${this.cfSiteKey}&url=${this.cfURL}`;
      const response = await axios.get(cfURL);
      const token = response?.data?.token;
      if (!token) {
        throw new Error("No CF token received");
      }
      console.log("[LoveVoice] CF token obtained successfully");
      return token;
    } catch (error) {
      console.error("[LoveVoice] Error getting CF token:", error.message);
      throw error;
    }
  }
  async voice_list() {
    if (this.voiceCache) {
      return this.voiceCache;
    }
    console.log("[LoveVoice] Mengambil daftar suara...");
    this.voiceCache = {
      "en-US": [{
        value: "voice-002",
        text: "Guy (Male)"
      }, {
        value: "voice-001",
        text: "Jenny (Female)"
      }, {
        value: "voice-003",
        text: "Ana (Female)"
      }, {
        value: "voice-004",
        text: "Aria (Female)"
      }, {
        value: "voice-005",
        text: "Christopher (Male)"
      }, {
        value: "voice-006",
        text: "Eric (Male)"
      }, {
        value: "voice-007",
        text: "Michelle (Female)"
      }, {
        value: "voice-008",
        text: "Roger (Male)"
      }],
      "en-AU": [{
        value: "voice-009",
        text: "Natasha (Female)"
      }, {
        value: "voice-010",
        text: "William (Male)"
      }],
      "en-CA": [{
        value: "voice-011",
        text: "Clara (Female)"
      }, {
        value: "voice-012",
        text: "Liam (Male)"
      }],
      "en-GB": [{
        value: "voice-013",
        text: "Libby (Female)"
      }, {
        value: "voice-014",
        text: "Maisie (Female)"
      }, {
        value: "voice-015",
        text: "Ryan (Male)"
      }, {
        value: "voice-016",
        text: "Sonia (Female)"
      }, {
        value: "voice-017",
        text: "Thomas (Male)"
      }],
      "en-HK": [{
        value: "voice-018",
        text: "Sam (Male)"
      }, {
        value: "voice-019",
        text: "Yan (Female)"
      }],
      "en-IE": [{
        value: "voice-020",
        text: "Connor (Male)"
      }, {
        value: "voice-021",
        text: "Emily (Female)"
      }],
      "en-IN": [{
        value: "voice-022",
        text: "Neerja (Female)"
      }, {
        value: "voice-023",
        text: "Prabhat (Male)"
      }],
      "en-KE": [{
        value: "voice-024",
        text: "Asilia (Female)"
      }, {
        value: "voice-025",
        text: "Chilemba (Male)"
      }],
      "en-NG": [{
        value: "voice-026",
        text: "Abeo (Male)"
      }, {
        value: "voice-027",
        text: "Ezinne (Female)"
      }],
      "en-NZ": [{
        value: "voice-028",
        text: "Mitchell (Male)"
      }],
      "en-PH": [{
        value: "voice-029",
        text: "James (Male)"
      }, {
        value: "voice-030",
        text: "Rosa (Female)"
      }],
      "en-SG": [{
        value: "voice-031",
        text: "Luna (Female)"
      }, {
        value: "voice-032",
        text: "Wayne (Male)"
      }],
      "en-TZ": [{
        value: "voice-033",
        text: "Elimu (Male)"
      }, {
        value: "voice-034",
        text: "Imani (Female)"
      }],
      "en-ZA": [{
        value: "voice-035",
        text: "Leah (Female)"
      }, {
        value: "voice-036",
        text: "Luke (Male)"
      }],
      "es-AR": [{
        value: "voice-037",
        text: "Elena (Female)"
      }, {
        value: "voice-038",
        text: "Tomas (Male)"
      }],
      "es-BO": [{
        value: "voice-039",
        text: "Marcelo (Male)"
      }, {
        value: "voice-040",
        text: "Sofia (Female)"
      }],
      "es-CO": [{
        value: "voice-041",
        text: "Gonzalo (Male)"
      }, {
        value: "voice-042",
        text: "Salome (Female)"
      }],
      "es-CR": [{
        value: "voice-043",
        text: "Juan (Male)"
      }, {
        value: "voice-044",
        text: "Maria (Female)"
      }],
      "es-CU": [{
        value: "voice-045",
        text: "Belkys (Female)"
      }],
      "es-DO": [{
        value: "voice-046",
        text: "Emilio (Male)"
      }, {
        value: "voice-047",
        text: "Ramona (Female)"
      }],
      "es-EC": [{
        value: "voice-048",
        text: "Andrea (Female)"
      }, {
        value: "voice-049",
        text: "Luis (Male)"
      }],
      "es-ES": [{
        value: "voice-050",
        text: "Alvaro (Male)"
      }, {
        value: "voice-051",
        text: "Elvira (Female)"
      }],
      "es-GQ": [{
        value: "voice-052",
        text: "Teresa (Female)"
      }],
      "es-GT": [{
        value: "voice-053",
        text: "Andres (Male)"
      }, {
        value: "voice-054",
        text: "Marta (Female)"
      }],
      "es-HN": [{
        value: "voice-055",
        text: "Carlos (Male)"
      }, {
        value: "voice-056",
        text: "Karla (Female)"
      }],
      "es-MX": [{
        value: "voice-057",
        text: "Dalia (Female)"
      }, {
        value: "voice-058",
        text: "Jorge (Male)"
      }],
      "es-NI": [{
        value: "voice-059",
        text: "Federico (Male)"
      }, {
        value: "voice-060",
        text: "Yolanda (Female)"
      }],
      "es-PA": [{
        value: "voice-061",
        text: "Margarita (Female)"
      }, {
        value: "voice-062",
        text: "Roberto (Male)"
      }],
      "es-PE": [{
        value: "voice-063",
        text: "Alex (Male)"
      }, {
        value: "voice-064",
        text: "Camila (Female)"
      }],
      "es-PR": [{
        value: "voice-065",
        text: "Karina (Female)"
      }, {
        value: "voice-066",
        text: "Victor (Male)"
      }],
      "es-PY": [{
        value: "voice-067",
        text: "Mario (Male)"
      }, {
        value: "voice-068",
        text: "Tania (Female)"
      }],
      "es-SV": [{
        value: "voice-069",
        text: "Lorena (Female)"
      }, {
        value: "voice-070",
        text: "Rodrigo (Male)"
      }],
      "es-US": [{
        value: "voice-071",
        text: "Alonso (Male)"
      }, {
        value: "voice-072",
        text: "Paloma (Female)"
      }],
      "es-UY": [{
        value: "voice-073",
        text: "Mateo (Male)"
      }, {
        value: "voice-074",
        text: "Valentina (Female)"
      }],
      "es-VE": [{
        value: "voice-075",
        text: "Paola (Female)"
      }, {
        value: "voice-076",
        text: "Sebastian (Male)"
      }],
      "et-EE": [{
        value: "voice-077",
        text: "Anu (Female)"
      }, {
        value: "voice-078",
        text: "Kert (Male)"
      }],
      "fa-IR": [{
        value: "voice-079",
        text: "Dilara (Female)"
      }, {
        value: "voice-080",
        text: "Farid (Male)"
      }],
      "fi-FI": [{
        value: "voice-081",
        text: "Harri (Male)"
      }, {
        value: "voice-082",
        text: "Noora (Female)"
      }],
      "fr-BE": [{
        value: "voice-083",
        text: "Charline (Female)"
      }, {
        value: "voice-084",
        text: "Gerard (Male)"
      }],
      "fr-CA": [{
        value: "voice-085",
        text: "Sylvie (Female)"
      }, {
        value: "voice-086",
        text: "Antoine (Male)"
      }, {
        value: "voice-087",
        text: "Jean (Male)"
      }],
      "fr-CH": [{
        value: "voice-088",
        text: "Ariane (Female)"
      }, {
        value: "voice-089",
        text: "Fabrice (Male)"
      }],
      "fr-FR": [{
        value: "voice-090",
        text: "Denise (Female)"
      }, {
        value: "voice-091",
        text: "Eloise (Female)"
      }, {
        value: "voice-092",
        text: "Henri (Male)"
      }],
      "zh-CN": [{
        value: "voice-093",
        text: "Xiaoxiao (Female)"
      }, {
        value: "voice-094",
        text: "Yunyang (Male)"
      }, {
        value: "voice-095",
        text: "Yunxi (Male)"
      }, {
        value: "voice-096",
        text: "Xiaoyi (Female)"
      }, {
        value: "voice-097",
        text: "Yunjian (Male)"
      }, {
        value: "voice-098",
        text: "Yunxia (Male)"
      }, {
        value: "voice-099",
        text: "Xiaobei (Female) (Northeastern Mandarin)"
      }, {
        value: "voice-100",
        text: "Xiaoni (Female) (Zhongyuan Mandarin Shaanxi)"
      }],
      "zh-HK": [{
        value: "voice-101",
        text: "HiuMaan (Female)"
      }, {
        value: "voice-102",
        text: "HiuGaai (Female)"
      }, {
        value: "voice-103",
        text: "WanLung (Male)"
      }],
      "zh-TW": [{
        value: "voice-104",
        text: "HsiaoChen (Female)"
      }, {
        value: "voice-105",
        text: "HsiaoYu (Female)"
      }, {
        value: "voice-106",
        text: "YunJhe (Male)"
      }],
      "de-AT": [{
        value: "voice-107",
        text: "Ingrid (Female)"
      }, {
        value: "voice-108",
        text: "Jonas (Male)"
      }],
      "de-CH": [{
        value: "voice-109",
        text: "Jan (Male)"
      }, {
        value: "voice-110",
        text: "Leni (Female)"
      }],
      "de-DE": [{
        value: "voice-111",
        text: "Katja (Female)"
      }, {
        value: "voice-112",
        text: "Amala (Female)"
      }, {
        value: "voice-113",
        text: "Conrad (Male)"
      }, {
        value: "voice-114",
        text: "Killian (Male)"
      }],
      "hi-IN": [{
        value: "voice-115",
        text: "Madhur (Male)"
      }, {
        value: "voice-116",
        text: "Swara (Female)"
      }],
      "it-IT": [{
        value: "voice-117",
        text: "Isabella (Female)"
      }, {
        value: "voice-118",
        text: "Diego (Male)"
      }, {
        value: "voice-119",
        text: "Elsa (Female)"
      }],
      "ja-JP": [{
        value: "voice-120",
        text: "Nanami (Female)"
      }, {
        value: "voice-121",
        text: "Keita (Male)"
      }],
      "ko-KR": [{
        value: "voice-122",
        text: "Sun-Hi (Female)"
      }, {
        value: "voice-123",
        text: "InJoon (Male)"
      }],
      "pt-BR": [{
        value: "voice-124",
        text: "Francisca (Female)"
      }, {
        value: "voice-125",
        text: "Antonio (Male)"
      }],
      "pt-PT": [{
        value: "voice-126",
        text: "Duarte (Male)"
      }, {
        value: "voice-127",
        text: "Raquel (Female)"
      }],
      "af-ZA": [{
        value: "voice-128",
        text: "Adri (Female)"
      }, {
        value: "voice-129",
        text: "Willem (Male)"
      }],
      "am-ET": [{
        value: "voice-130",
        text: "Ameha (Male)"
      }, {
        value: "voice-131",
        text: "Mekdes (Female)"
      }],
      "ar-AE": [{
        value: "voice-132",
        text: "Fatima (Female)"
      }, {
        value: "voice-133",
        text: "Hamdan (Male)"
      }],
      "ar-BH": [{
        value: "voice-134",
        text: "Ali (Male)"
      }, {
        value: "voice-135",
        text: "Laila (Female)"
      }],
      "ar-DZ": [{
        value: "voice-136",
        text: "Ismael (Male)"
      }],
      "ar-EG": [{
        value: "voice-137",
        text: "Salma (Female)"
      }, {
        value: "voice-138",
        text: "Shakir (Male)"
      }],
      "ar-IQ": [{
        value: "voice-139",
        text: "Bassel (Male)"
      }, {
        value: "voice-140",
        text: "Rana (Female)"
      }],
      "ar-JO": [{
        value: "voice-141",
        text: "Sana (Female)"
      }, {
        value: "voice-142",
        text: "Taim (Male)"
      }],
      "ar-KW": [{
        value: "voice-143",
        text: "Fahed (Male)"
      }, {
        value: "voice-144",
        text: "Noura (Female)"
      }],
      "ar-LB": [{
        value: "voice-145",
        text: "Layla (Female)"
      }, {
        value: "voice-146",
        text: "Rami (Male)"
      }],
      "ar-LY": [{
        value: "voice-147",
        text: "Iman (Female)"
      }, {
        value: "voice-148",
        text: "Omar (Male)"
      }],
      "ar-MA": [{
        value: "voice-149",
        text: "Jamal (Male)"
      }, {
        value: "voice-150",
        text: "Mouna (Female)"
      }],
      "ar-OM": [{
        value: "voice-151",
        text: "Abdullah (Male)"
      }, {
        value: "voice-152",
        text: "Aysha (Female)"
      }],
      "ar-QA": [{
        value: "voice-153",
        text: "Amal (Female)"
      }, {
        value: "voice-154",
        text: "Moaz (Male)"
      }],
      "ar-SA": [{
        value: "voice-155",
        text: "Hamed (Male)"
      }, {
        value: "voice-156",
        text: "Zariyah (Female)"
      }],
      "ar-SY": [{
        value: "voice-157",
        text: "Amany (Female)"
      }, {
        value: "voice-158",
        text: "Laith (Male)"
      }],
      "ar-TN": [{
        value: "voice-159",
        text: "Hedi (Male)"
      }, {
        value: "voice-160",
        text: "Reem (Female)"
      }],
      "ar-YE": [{
        value: "voice-161",
        text: "Maryam (Female)"
      }, {
        value: "voice-162",
        text: "Saleh (Male)"
      }],
      "az-AZ": [{
        value: "voice-163",
        text: "Babek (Male)"
      }, {
        value: "voice-164",
        text: "Banu (Female)"
      }],
      "bg-BG": [{
        value: "voice-165",
        text: "Borislav (Male)"
      }, {
        value: "voice-166",
        text: "Kalina (Female)"
      }],
      "bn-BD": [{
        value: "voice-167",
        text: "Nabanita (Female)"
      }, {
        value: "voice-168",
        text: "Pradeep (Male)"
      }],
      "bn-IN": [{
        value: "voice-169",
        text: "Bashkar (Male)"
      }, {
        value: "voice-170",
        text: "Tanishaa (Female)"
      }],
      "bs-BA": [{
        value: "voice-171",
        text: "Goran (Male)"
      }, {
        value: "voice-172",
        text: "Vesna (Female)"
      }],
      "ca-ES": [{
        value: "voice-173",
        text: "Joana (Female)"
      }, {
        value: "voice-174",
        text: "Enric (Male)"
      }],
      "cs-CZ": [{
        value: "voice-175",
        text: "Antonin (Male)"
      }, {
        value: "voice-176",
        text: "Vlasta (Female)"
      }],
      "cy-GB": [{
        value: "voice-177",
        text: "Aled (Male)"
      }, {
        value: "voice-178",
        text: "Nia (Female)"
      }],
      "da-DK": [{
        value: "voice-179",
        text: "Christel (Female)"
      }, {
        value: "voice-180",
        text: "Jeppe (Male)"
      }],
      "el-GR": [{
        value: "voice-181",
        text: "Athina (Female)"
      }, {
        value: "voice-182",
        text: "Nestoras (Male)"
      }],
      "ga-IE": [{
        value: "voice-183",
        text: "Colm (Male)"
      }, {
        value: "voice-184",
        text: "Orla (Female)"
      }],
      "gl-ES": [{
        value: "voice-185",
        text: "Roi (Male)"
      }, {
        value: "voice-186",
        text: "Sabela (Female)"
      }],
      "gu-IN": [{
        value: "voice-187",
        text: "Dhwani (Female)"
      }, {
        value: "voice-188",
        text: "Niranjan (Male)"
      }],
      "he-IL": [{
        value: "voice-189",
        text: "Avri (Male)"
      }, {
        value: "voice-190",
        text: "Hila (Female)"
      }],
      "hr-HR": [{
        value: "voice-191",
        text: "Gabrijela (Female)"
      }, {
        value: "voice-192",
        text: "Srecko (Male)"
      }],
      "hu-HU": [{
        value: "voice-193",
        text: "Noemi (Female)"
      }, {
        value: "voice-194",
        text: "Tamas (Male)"
      }],
      "id-ID": [{
        value: "voice-195",
        text: "Ardi (Male)"
      }, {
        value: "voice-196",
        text: "Gadis (Female)"
      }],
      "is-IS": [{
        value: "voice-197",
        text: "Gudrun (Female)"
      }, {
        value: "voice-198",
        text: "Gunnar (Male)"
      }],
      "jv-ID": [{
        value: "voice-199",
        text: "Dimas (Male)"
      }, {
        value: "voice-200",
        text: "Siti (Female)"
      }],
      "ka-GE": [{
        value: "voice-201",
        text: "Eka (Female)"
      }, {
        value: "voice-202",
        text: "Giorgi (Male)"
      }],
      "kk-KZ": [{
        value: "voice-203",
        text: "Aigul (Female)"
      }, {
        value: "voice-204",
        text: "Daulet (Male)"
      }],
      "km-KH": [{
        value: "voice-205",
        text: "Piseth (Male)"
      }, {
        value: "voice-206",
        text: "Sreymom (Female)"
      }],
      "kn-IN": [{
        value: "voice-207",
        text: "Gagan (Male)"
      }, {
        value: "voice-208",
        text: "Sapna (Female)"
      }],
      "lo-LA": [{
        value: "voice-209",
        text: "Chanthavong (Male)"
      }, {
        value: "voice-210",
        text: "Keomany (Female)"
      }],
      "lt-LT": [{
        value: "voice-211",
        text: "Leonas (Male)"
      }, {
        value: "voice-212",
        text: "Ona (Female)"
      }],
      "lv-LV": [{
        value: "voice-213",
        text: "Everita (Female)"
      }, {
        value: "voice-214",
        text: "Nils (Male)"
      }],
      "mk-MK": [{
        value: "voice-215",
        text: "Aleksandar (Male)"
      }, {
        value: "voice-216",
        text: "Marija (Female)"
      }],
      "ml-IN": [{
        value: "voice-217",
        text: "Midhun (Male)"
      }, {
        value: "voice-218",
        text: "Sobhana (Female)"
      }],
      "mn-MN": [{
        value: "voice-219",
        text: "Bataa (Male)"
      }, {
        value: "voice-220",
        text: "Yesui (Female)"
      }],
      "mr-IN": [{
        value: "voice-221",
        text: "Aarohi (Female)"
      }, {
        value: "voice-222",
        text: "Manohar (Male)"
      }],
      "ms-MY": [{
        value: "voice-223",
        text: "Osman (Male)"
      }, {
        value: "voice-224",
        text: "Yasmin (Female)"
      }],
      "mt-MT": [{
        value: "voice-225",
        text: "Grace (Female)"
      }, {
        value: "voice-226",
        text: "Joseph (Male)"
      }],
      "my-MM": [{
        value: "voice-227",
        text: "Nilar (Female)"
      }, {
        value: "voice-228",
        text: "Thiha (Male)"
      }],
      "nb-NO": [{
        value: "voice-229",
        text: "Pernille (Female)"
      }, {
        value: "voice-230",
        text: "Finn (Male)"
      }],
      "ne-NP": [{
        value: "voice-231",
        text: "Hemkala (Female)"
      }, {
        value: "voice-232",
        text: "Sagar (Male)"
      }],
      "nl-BE": [{
        value: "voice-233",
        text: "Arnaud (Male)"
      }, {
        value: "voice-234",
        text: "Dena (Female)"
      }],
      "nl-NL": [{
        value: "voice-235",
        text: "Colette (Female)"
      }, {
        value: "voice-236",
        text: "Fenna (Female)"
      }, {
        value: "voice-237",
        text: "Maarten (Male)"
      }],
      "pl-PL": [{
        value: "voice-238",
        text: "Marek (Male)"
      }, {
        value: "voice-239",
        text: "Zofia (Female)"
      }],
      "ps-AF": [{
        value: "voice-240",
        text: "Gul Nawaz (Male)"
      }, {
        value: "voice-241",
        text: "Latifa (Female)"
      }],
      "ro-RO": [{
        value: "voice-242",
        text: "Alina (Female)"
      }, {
        value: "voice-243",
        text: "Emil (Male)"
      }],
      "ru-RU": [{
        value: "voice-244",
        text: "Svetlana (Female)"
      }, {
        value: "voice-245",
        text: "Dmitry (Male)"
      }],
      "si-LK": [{
        value: "voice-246",
        text: "Sameera (Male)"
      }, {
        value: "voice-247",
        text: "Thilini (Female)"
      }],
      "sk-SK": [{
        value: "voice-248",
        text: "Lukas (Male)"
      }, {
        value: "voice-249",
        text: "Viktoria (Female)"
      }],
      "sl-SI": [{
        value: "voice-250",
        text: "Petra (Female)"
      }, {
        value: "voice-251",
        text: "Rok (Male)"
      }],
      "so-SO": [{
        value: "voice-252",
        text: "Muuse (Male)"
      }, {
        value: "voice-253",
        text: "Ubax (Female)"
      }],
      "sq-AL": [{
        value: "voice-254",
        text: "Anila (Female)"
      }, {
        value: "voice-255",
        text: "Ilir (Male)"
      }],
      "sr-RS": [{
        value: "voice-256",
        text: "Nicholas (Male)"
      }, {
        value: "voice-257",
        text: "Sophie (Female)"
      }],
      "su-ID": [{
        value: "voice-258",
        text: "Jajang (Male)"
      }, {
        value: "voice-259",
        text: "Tuti (Female)"
      }],
      "sv-SE": [{
        value: "voice-260",
        text: "Sofie (Female)"
      }, {
        value: "voice-261",
        text: "Mattias (Male)"
      }],
      "sw-KE": [{
        value: "voice-262",
        text: "Rafiki (Male)"
      }, {
        value: "voice-263",
        text: "Zuri (Female)"
      }],
      "sw-TZ": [{
        value: "voice-264",
        text: "Daudi (Male)"
      }, {
        value: "voice-265",
        text: "Rehema (Female)"
      }],
      "ta-IN": [{
        value: "voice-266",
        text: "Pallavi (Female)"
      }, {
        value: "voice-267",
        text: "Valluvar (Male)"
      }],
      "ta-LK": [{
        value: "voice-268",
        text: "Kumar (Male)"
      }, {
        value: "voice-269",
        text: "Saranya (Female)"
      }],
      "ta-MY": [{
        value: "voice-270",
        text: "Kani (Female)"
      }, {
        value: "voice-271",
        text: "Surya (Male)"
      }],
      "ta-SG": [{
        value: "voice-272",
        text: "Anbu (Male)"
      }],
      "te-IN": [{
        value: "voice-273",
        text: "Mohan (Male)"
      }, {
        value: "voice-274",
        text: "Shruti (Female)"
      }],
      "th-TH": [{
        value: "voice-275",
        text: "Premwadee (Female)"
      }, {
        value: "voice-276",
        text: "Niwat (Male)"
      }],
      "tr-TR": [{
        value: "voice-277",
        text: "Ahmet (Male)"
      }, {
        value: "voice-278",
        text: "Emel (Female)"
      }],
      "uk-UA": [{
        value: "voice-279",
        text: "Ostap (Male)"
      }, {
        value: "voice-280",
        text: "Polina (Female)"
      }],
      "ur-IN": [{
        value: "voice-281",
        text: "Gul (Female)"
      }, {
        value: "voice-282",
        text: "Salman (Male)"
      }],
      "ur-PK": [{
        value: "voice-283",
        text: "Asad (Male)"
      }, {
        value: "voice-284",
        text: "Uzma (Female)"
      }],
      "uz-UZ": [{
        value: "voice-285",
        text: "Madina (Female)"
      }, {
        value: "voice-286",
        text: "Sardor (Male)"
      }],
      "vi-VN": [{
        value: "voice-287",
        text: "HoaiMy (Female)"
      }, {
        value: "voice-288",
        text: "NamMinh (Male)"
      }],
      "zu-ZA": [{
        value: "voice-289",
        text: "Thando (Female)"
      }, {
        value: "voice-290",
        text: "Themba (Male)"
      }]
    };
    console.log("[LoveVoice] Berhasil mengambil daftar suara");
    return this.voiceCache;
  }
  async findVoice(voiceInput) {
    if (!voiceInput) {
      return "voice-002";
    }
    const voices = await this.voice_list();
    const inputLower = voiceInput.toLowerCase().trim();
    for (const [locale, voiceList] of Object.entries(voices)) {
      if (Array.isArray(voiceList)) {
        const found = voiceList.find(v => {
          if (v.value && v.value.toLowerCase() === inputLower) return true;
          if (v.text && v.text.toLowerCase() === inputLower) return true;
          return false;
        });
        if (found) {
          console.log(`[LoveVoice] Voice ditemukan: "${voiceInput}" -> "${found.value}"`);
          return found.value;
        }
      }
    }
    console.warn(`[LoveVoice] Voice "${voiceInput}" tidak ditemukan, menggunakan input mentah`);
    return voiceInput;
  }
  async generate({
    text,
    voice,
    rate,
    volume,
    pitch
  }) {
    try {
      const selectedVoice = await this.findVoice(voice);
      console.log(`[LoveVoice] Starting TTS generation for text: "${text?.substring(0, 50)}..."`);
      console.log(`[LoveVoice] Using voice: ${selectedVoice}`);
      const form = new FormData();
      form.append("text", text || "");
      form.append("voice", selectedVoice);
      form.append("rate", rate || 0);
      form.append("volume", volume || 0);
      form.append("pitch", pitch || 0);
      const cfToken = await this.getCfToken();
      form.append("cf-turnstile-response", cfToken);
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: this.baseURL,
        referer: `${this.baseURL}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...form.getHeaders()
      };
      console.log("[LoveVoice] Sending request to LoveVoice API...");
      const response = await axios.post(`${this.baseURL}/api/text-to-speech`, form, {
        headers: headers,
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"];
      const contentLength = response.headers["content-length"];
      console.log(`[LoveVoice] Audio received: ${contentType}, size: ${contentLength || "unknown"} bytes`);
      return {
        audio: response.data,
        contentType: contentType || "audio/mpeg"
      };
    } catch (error) {
      console.error("[LoveVoice] Error in TTS generation:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi (voice_list/generate)"
    });
  }
  const api = new LoveVoiceClient();
  try {
    switch (action) {
      case "voice_list":
        const voices = await api.voice_list();
        return res.status(200).json(voices);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi"
          });
        }
        const result = await api.generate(params);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("Content-Disposition", 'inline; filename="lovevoice_audio.mp3"');
        return res.status(200).send(result.audio);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`
        });
    }
  } catch (error) {
    console.error(`[LoveVoice] Error pada action '${action}':`, error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan server"
    });
  }
}