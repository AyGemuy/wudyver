import WebSocket from "ws";
import {
  URL
} from "url";
import FormData from "form-data";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const voiceList = JSON.parse('[{"path_on_server":"expresso/ex01-ex02_default_001_channel1_168s.wav"},{"path_on_server":"expresso/ex01-ex02_default_001_channel2_198s.wav","name":"Default (US, f)","default_text":"How was your weekend? Me, I spent three hours at IKEA on Saturday trying to buy a simple lamp, but somehow ended up in the kitchen section arguing with my partner about whether we need a garlic press. I left with nothing but a bag of those little Swedish meatballs and a deep existential crisis about furniture shopping."},{"path_on_server":"expresso/ex01-ex02_enunciated_001_channel1_432s.wav"},{"path_on_server":"expresso/ex01-ex02_enunciated_001_channel2_354s.wav"},{"path_on_server":"expresso/ex01-ex02_fast_001_channel1_104s.wav"},{"path_on_server":"expresso/ex01-ex02_fast_001_channel2_73s.wav"},{"path_on_server":"expresso/ex01-ex02_projected_001_channel1_46s.wav"},{"path_on_server":"expresso/ex01-ex02_projected_002_channel2_248s.wav"},{"path_on_server":"expresso/ex01-ex02_whisper_001_channel1_579s.wav"},{"path_on_server":"expresso/ex01-ex02_whisper_001_channel2_717s.wav"},{"path_on_server":"expresso/ex03-ex01_angry_001_channel1_201s.wav","name":"Angry (US, m)","default_text":"What\'s your problem, buddy?"},{"path_on_server":"expresso/ex03-ex01_angry_001_channel2_181s.wav"},{"path_on_server":"expresso/ex03-ex01_awe_001_channel1_1323s.wav"},{"path_on_server":"expresso/ex03-ex01_awe_001_channel2_1290s.wav"},{"path_on_server":"expresso/ex03-ex01_calm_001_channel1_1143s.wav","name":"Calming (US, m)","default_text":"Take a deep breath and allow your body to settle into a comfortable position, whether sitting or lying down. Close your eyes gently and bring your attention to the natural rhythm of your breathing."},{"path_on_server":"expresso/ex03-ex01_calm_001_channel2_1081s.wav"},{"path_on_server":"expresso/ex03-ex01_confused_001_channel1_909s.wav","name":"Confused (US, m)","default_text":"Hold on... where does this metal bracket go? It’s not even mentioned in step 5. Did we screw this on backwards or something?"},{"path_on_server":"expresso/ex03-ex01_confused_001_channel2_816s.wav"},{"path_on_server":"expresso/ex03-ex01_desire_004_channel1_545s.wav"},{"path_on_server":"expresso/ex03-ex01_desire_004_channel2_580s.wav","name":"Desire (US, m)","default_text":"Those chocolate pralines look so delicious."},{"path_on_server":"expresso/ex03-ex01_disgusted_004_channel1_170s.wav"},{"path_on_server":"expresso/ex03-ex01_enunciated_001_channel1_388s.wav"},{"path_on_server":"expresso/ex03-ex01_enunciated_001_channel2_576s.wav"},{"path_on_server":"expresso/ex03-ex01_happy_001_channel1_334s.wav"},{"path_on_server":"expresso/ex03-ex01_happy_001_channel2_257s.wav"},{"path_on_server":"expresso/ex03-ex01_laughing_001_channel1_188s.wav","name":"Show host (US, m)","default_text":"Now, next up we have someone who quit their job as a tax accountant last month to pursue comedy full-time, which either makes them incredibly brave or completely insane. Let\'s find out together, please welcome the delightfully unhinged Riley Chen!","priority":10},{"path_on_server":"expresso/ex03-ex01_laughing_002_channel2_232s.wav"},{"path_on_server":"expresso/ex03-ex01_nonverbal_001_channel2_37s.wav"},{"path_on_server":"expresso/ex03-ex01_nonverbal_006_channel1_62s.wav"},{"path_on_server":"expresso/ex03-ex01_sarcastic_001_channel1_435s.wav"},{"path_on_server":"expresso/ex03-ex01_sarcastic_001_channel2_491s.wav","name":"Sarcastic (US, m)","default_text":"Mhm, sure. Brilliant idea. Can\'t believe I hadn\'t thought of that."},{"path_on_server":"expresso/ex03-ex01_sleepy_001_channel1_619s.wav","name":"Jazz radio (US, m)","default_text":"Coming up next, we\'ve got something special. This is Yussef Kamaal with Black Focus, and if you\'re not familiar with this London duo, get ready for \\"a seamless weave of spiritual jazz funk, broken beat, and global sounds\\". Enjoy."},{"path_on_server":"expresso/ex03-ex01_sleepy_001_channel2_662s.wav"},{"path_on_server":"expresso/ex03-ex02_animal-animaldir_002_channel2_89s.wav"},{"path_on_server":"expresso/ex03-ex02_animal-animaldir_003_channel1_32s.wav"},{"path_on_server":"expresso/ex03-ex02_animaldir-animal_008_channel1_147s.wav"},{"path_on_server":"expresso/ex03-ex02_animaldir-animal_008_channel2_136s.wav"},{"path_on_server":"expresso/ex03-ex02_child-childdir_001_channel1_291s.wav"},{"path_on_server":"expresso/ex03-ex02_child-childdir_001_channel2_69s.wav"},{"path_on_server":"expresso/ex03-ex02_childdir-child_004_channel1_308s.wav"},{"path_on_server":"expresso/ex03-ex02_childdir-child_004_channel2_187s.wav"},{"path_on_server":"expresso/ex03-ex02_laughing_001_channel1_248s.wav"},{"path_on_server":"expresso/ex03-ex02_laughing_001_channel2_234s.wav"},{"path_on_server":"expresso/ex03-ex02_narration_001_channel1_674s.wav"},{"path_on_server":"expresso/ex03-ex02_narration_002_channel2_1136s.wav"},{"path_on_server":"expresso/ex03-ex02_sad-sympathetic_001_channel1_454s.wav"},{"path_on_server":"expresso/ex03-ex02_sad-sympathetic_001_channel2_400s.wav"},{"path_on_server":"expresso/ex03-ex02_sympathetic-sad_008_channel1_215s.wav"},{"path_on_server":"expresso/ex03-ex02_sympathetic-sad_008_channel2_268s.wav","name":"Sad (US, f)","default_text":"I keep checking my phone hoping she\'ll text me back, but it\'s been three days and I think I have to accept that it\'s really over this time."},{"path_on_server":"expresso/ex04-ex01_animal-animaldir_006_channel1_196s.wav"},{"path_on_server":"expresso/ex04-ex01_animal-animaldir_006_channel2_49s.wav"},{"path_on_server":"expresso/ex04-ex01_animaldir-animal_001_channel1_118s.wav"},{"path_on_server":"expresso/ex04-ex01_animaldir-animal_004_channel2_88s.wav"},{"path_on_server":"expresso/ex04-ex01_child-childdir_003_channel2_283s.wav"},{"path_on_server":"expresso/ex04-ex01_child-childdir_004_channel1_118s.wav"},{"path_on_server":"expresso/ex04-ex01_childdir-child_001_channel1_228s.wav"},{"path_on_server":"expresso/ex04-ex01_childdir-child_001_channel2_420s.wav"},{"path_on_server":"expresso/ex04-ex01_disgusted_001_channel1_130s.wav"},{"path_on_server":"expresso/ex04-ex01_disgusted_001_channel2_325s.wav"},{"path_on_server":"expresso/ex04-ex01_laughing_001_channel1_306s.wav"},{"path_on_server":"expresso/ex04-ex01_laughing_001_channel2_293s.wav"},{"path_on_server":"expresso/ex04-ex01_narration_001_channel1_605s.wav","name":"Narration (US, f)","default_text":"Luna was the smallest star in the entire night sky, so tiny that most people couldn\'t even see her twinkling up above. While her big sister stars shone brightly and guided ships across the ocean, Luna felt invisible and sad."},{"path_on_server":"expresso/ex04-ex01_narration_001_channel2_686s.wav"},{"path_on_server":"expresso/ex04-ex01_sad-sympathetic_001_channel1_267s.wav"},{"path_on_server":"expresso/ex04-ex01_sad-sympathetic_001_channel2_346s.wav"},{"path_on_server":"expresso/ex04-ex01_sympathetic-sad_008_channel1_415s.wav"},{"path_on_server":"expresso/ex04-ex01_sympathetic-sad_008_channel2_453s.wav","name":"Sad (IE, m)","default_text":"I keep checking my phone hoping she\'ll text me back, but it\'s been three days and I think I have to accept that it\'s really over this time."},{"path_on_server":"expresso/ex04-ex02_angry_001_channel1_119s.wav","name":"Angry (US, f)","default_text":"I can\'t believe he\'d do that. Who the hell does he think he is?"},{"path_on_server":"expresso/ex04-ex02_angry_001_channel2_150s.wav"},{"path_on_server":"expresso/ex04-ex02_awe_001_channel1_982s.wav"},{"path_on_server":"expresso/ex04-ex02_awe_001_channel2_1013s.wav"},{"path_on_server":"expresso/ex04-ex02_bored_001_channel1_254s.wav"},{"path_on_server":"expresso/ex04-ex02_bored_001_channel2_232s.wav"},{"path_on_server":"expresso/ex04-ex02_calm_001_channel2_336s.wav","name":"Calming (US, f)","default_text":"Take a deep breath and allow your body to settle into a comfortable position, whether sitting or lying down. Close your eyes gently and bring your attention to the natural rhythm of your breathing."},{"path_on_server":"expresso/ex04-ex02_calm_002_channel1_480s.wav"},{"path_on_server":"expresso/ex04-ex02_confused_001_channel1_499s.wav","name":"Confused (US, f)","default_text":"Hold on... where does this metal bracket go? It’s not even mentioned in step 5. Did we screw this on backwards or something?"},{"path_on_server":"expresso/ex04-ex02_confused_001_channel2_488s.wav"},{"path_on_server":"expresso/ex04-ex02_desire_001_channel1_657s.wav"},{"path_on_server":"expresso/ex04-ex02_desire_001_channel2_694s.wav","name":"Desire (US, f)","default_text":"Those chocolate pralines look so delicious."},{"path_on_server":"expresso/ex04-ex02_disgusted_001_channel2_98s.wav"},{"path_on_server":"expresso/ex04-ex02_disgusted_004_channel1_169s.wav"},{"path_on_server":"expresso/ex04-ex02_enunciated_001_channel1_496s.wav"},{"path_on_server":"expresso/ex04-ex02_enunciated_001_channel2_898s.wav"},{"path_on_server":"expresso/ex04-ex02_fearful_001_channel1_316s.wav","name":"Fearful (US, f)","default_text":"Oh my god, did you see that? I think someone\'s following us... we need to get out of here, right now. My heart is pounding so hard I can barely breathe."},{"path_on_server":"expresso/ex04-ex02_fearful_001_channel2_266s.wav"},{"path_on_server":"expresso/ex04-ex02_happy_001_channel1_118s.wav"},{"path_on_server":"expresso/ex04-ex02_happy_001_channel2_140s.wav"},{"path_on_server":"expresso/ex04-ex02_laughing_001_channel1_147s.wav"},{"path_on_server":"expresso/ex04-ex02_laughing_001_channel2_159s.wav"},{"path_on_server":"expresso/ex04-ex02_nonverbal_004_channel1_18s.wav"},{"path_on_server":"expresso/ex04-ex02_nonverbal_004_channel2_71s.wav"},{"path_on_server":"expresso/ex04-ex02_sarcastic_001_channel1_519s.wav"},{"path_on_server":"expresso/ex04-ex02_sarcastic_001_channel2_466s.wav","name":"Sarcastic (US, f)","default_text":"Mhm, sure. Brilliant idea. Can\'t believe I hadn\'t thought of that."},{"path_on_server":"expresso/ex04-ex03_default_001_channel1_3s.wav"},{"path_on_server":"expresso/ex04-ex03_default_002_channel2_239s.wav"},{"path_on_server":"expresso/ex04-ex03_enunciated_001_channel1_86s.wav"},{"path_on_server":"expresso/ex04-ex03_enunciated_001_channel2_342s.wav"},{"path_on_server":"expresso/ex04-ex03_fast_001_channel1_208s.wav"},{"path_on_server":"expresso/ex04-ex03_fast_001_channel2_25s.wav"},{"path_on_server":"expresso/ex04-ex03_projected_001_channel1_192s.wav"},{"path_on_server":"expresso/ex04-ex03_projected_001_channel2_179s.wav"},{"path_on_server":"expresso/ex04-ex03_whisper_001_channel1_198s.wav","name":"Whisper (US, f)","default_text":"Hey... I\'ve been staring at this calculus for like two hours straight and my brain is totally fried. Want to grab a quick coffee? I promise I\'ll be super quiet when we get back."},{"path_on_server":"expresso/ex04-ex03_whisper_002_channel2_266s.wav"},{"path_on_server":"unmute-prod-website/degaulle-2.wav","name":"Unmute - Charles de Gaulle","default_text":"Je suis le général Charles de Gaulle !"},{"path_on_server":"unmute-prod-website/developer-1.mp3","name":"Unmute - Dev"},{"path_on_server":"unmute-prod-website/developpeuse-3.wav","name":"Unmute - Développeuse","default_text":"Salut ! Comment ça va ?"},{"path_on_server":"unmute-prod-website/ex04_narration_longform_00001.wav"},{"path_on_server":"unmute-prod-website/fabieng-enhanced-v2.wav","name":"Unmute - Fabieng","default_text":"Que veux-tu optimiser aujourd\'hui ?"},{"path_on_server":"unmute-prod-website/freesound/440565_why-is-there-educationwav.mp3","name":"Unmute - Gertrude"},{"path_on_server":"unmute-prod-website/freesound/519189_request-42---hmm-i-dont-knowwav.mp3","name":"Unmute - Quiz show"},{"path_on_server":"unmute-prod-website/p329_022.wav","name":"Unmute - Watercooler"},{"path_on_server":"voice-donations/0a67.wav"},{"path_on_server":"voice-donations/2181.wav"},{"path_on_server":"voice-donations/245e.wav"},{"path_on_server":"voice-donations/29da.wav"},{"path_on_server":"voice-donations/468c.wav"},{"path_on_server":"voice-donations/8dc9.wav"},{"path_on_server":"voice-donations/AbD.wav"},{"path_on_server":"voice-donations/aepeak.wav"},{"path_on_server":"voice-donations/Ajith.wav"},{"path_on_server":"voice-donations/AmitNag.wav"},{"path_on_server":"voice-donations/Aryobe.wav"},{"path_on_server":"voice-donations/ASEN.wav"},{"path_on_server":"voice-donations/bathri.wav"},{"path_on_server":"voice-donations/bc98.wav"},{"path_on_server":"voice-donations/bevi.wav"},{"path_on_server":"voice-donations/Bobby_McFern.wav"},{"path_on_server":"voice-donations/boom.wav"},{"path_on_server":"voice-donations/BrokenHypocrite.wav"},{"path_on_server":"voice-donations/Butter.wav"},{"path_on_server":"voice-donations/d4a9.wav"},{"path_on_server":"voice-donations/dce6.wav"},{"path_on_server":"voice-donations/Deepak.wav"},{"path_on_server":"voice-donations/Dhruv_Rao.wav"},{"path_on_server":"voice-donations/dwp.wav"},{"path_on_server":"voice-donations/Enrique_(Spanish).wav"},{"path_on_server":"voice-donations/Enrique.wav"},{"path_on_server":"voice-donations/f9cf.wav"},{"path_on_server":"voice-donations/Ferdinand.wav"},{"path_on_server":"voice-donations/Glenn.wav"},{"path_on_server":"voice-donations/gmaskell92.wav"},{"path_on_server":"voice-donations/Goku.wav"},{"path_on_server":"voice-donations/hielos_1.wav"},{"path_on_server":"voice-donations/hielos_2.wav"},{"path_on_server":"voice-donations/Jaw.wav"},{"path_on_server":"voice-donations/Jeff_Andrew.wav"},{"path_on_server":"voice-donations/Jeffrey.wav"},{"path_on_server":"voice-donations/Jeremy_Q.wav"},{"path_on_server":"voice-donations/Jimmy.wav"},{"path_on_server":"voice-donations/Karti.wav"},{"path_on_server":"voice-donations/kbrn1.wav"},{"path_on_server":"voice-donations/Koorosh.wav"},{"path_on_server":"voice-donations/Lake.wav"},{"path_on_server":"voice-donations/LC.wav"},{"path_on_server":"voice-donations/L_Roy.wav"},{"path_on_server":"voice-donations/Nick.wav"},{"path_on_server":"voice-donations/Parthiban.wav"},{"path_on_server":"voice-donations/Prakash369.wav"},{"path_on_server":"voice-donations/Qasim_Wali_Khan.wav"},{"path_on_server":"voice-donations/Ranjith.wav"},{"path_on_server":"voice-donations/ra_XOr.wav"},{"path_on_server":"voice-donations/Roscoe.wav"},{"path_on_server":"voice-donations/Selfie.wav"},{"path_on_server":"voice-donations/Sheddy.wav"},{"path_on_server":"voice-donations/Siddh_Indian.wav"},{"path_on_server":"voice-donations/solace.wav"},{"path_on_server":"voice-donations/temp-007.wav"},{"path_on_server":"voice-donations/The_other_brother.wav"},{"path_on_server":"voice-donations/thepolishdane.wav"},{"path_on_server":"voice-donations/vinayak.wav"},{"path_on_server":"voice-donations/W_A_H.wav"},{"path_on_server":"voice-donations/Youfied.wav"},{"path_on_server":"voice-donations/Yuush.wav"},{"path_on_server":"cml-tts/fr/10087_11650_000028-0002.wav"},{"path_on_server":"cml-tts/fr/10177_10625_000134-0003.wav"},{"path_on_server":"cml-tts/fr/10179_11051_000005-0001.wav"},{"path_on_server":"cml-tts/fr/12080_11650_000047-0001.wav"},{"path_on_server":"cml-tts/fr/12205_11650_000004-0002.wav"},{"path_on_server":"cml-tts/fr/12977_10625_000037-0001.wav","name":"CML 12977 (FR, f)","default_text":"Je pense que ces chaussures ne vont pas bien avec ma chemise."},{"path_on_server":"cml-tts/fr/1406_1028_000009-0003.wav","name":"CML 1406 (FR, m)","default_text":"Je pense que ces chaussures ne vont pas bien avec ma chemise."},{"path_on_server":"cml-tts/fr/1591_1028_000108-0004.wav"},{"path_on_server":"cml-tts/fr/1770_1028_000036-0002.wav"},{"path_on_server":"cml-tts/fr/2114_1656_000053-0001.wav"},{"path_on_server":"cml-tts/fr/2154_2576_000020-0003.wav","name":"CML 2154 (FR, f)","default_text":"Je pense que ces chaussures ne vont pas bien avec ma chemise."},{"path_on_server":"cml-tts/fr/2216_1745_000007-0001.wav"},{"path_on_server":"cml-tts/fr/2223_1745_000009-0002.wav"},{"path_on_server":"cml-tts/fr/2465_1943_000152-0002.wav"},{"path_on_server":"cml-tts/fr/296_1028_000022-0001.wav"},{"path_on_server":"cml-tts/fr/3267_1902_000075-0001.wav"},{"path_on_server":"cml-tts/fr/4193_3103_000004-0001.wav"},{"path_on_server":"cml-tts/fr/4482_3103_000063-0001.wav"},{"path_on_server":"cml-tts/fr/4724_3731_000031-0001.wav","name":"CML 4724 (FR, m)","default_text":"Je pense que ces chaussures ne vont pas bien avec ma chemise."},{"path_on_server":"cml-tts/fr/4937_3731_000004-0001.wav"},{"path_on_server":"cml-tts/fr/5207_3078_000031-0002.wav"},{"path_on_server":"cml-tts/fr/5476_3103_000072-0001.wav"},{"path_on_server":"cml-tts/fr/577_394_000070-0001.wav"},{"path_on_server":"cml-tts/fr/5790_4893_000052-0001.wav"},{"path_on_server":"cml-tts/fr/579_2548_000015-0001.wav"},{"path_on_server":"cml-tts/fr/5830_4703_000037-0001.wav"},{"path_on_server":"cml-tts/fr/6318_7016_000027-0002.wav"},{"path_on_server":"cml-tts/fr/7142_2432_000124-0003.wav"},{"path_on_server":"cml-tts/fr/7400_2928_000100-0001.wav"},{"path_on_server":"cml-tts/fr/7591_6742_000149-0002.wav"},{"path_on_server":"cml-tts/fr/7601_7727_000062-0001.wav"},{"path_on_server":"cml-tts/fr/7762_8734_000048-0002.wav"},{"path_on_server":"cml-tts/fr/8128_7016_000047-0002.wav"},{"path_on_server":"cml-tts/fr/928_486_000075-0001.wav"},{"path_on_server":"cml-tts/fr/9834_9697_000150-0003.wav"},{"path_on_server":"vctk/p225_023.wav"},{"path_on_server":"vctk/p226_023.wav","name":"VCTK 226 (UK, m)"},{"path_on_server":"vctk/p227_023.wav"},{"path_on_server":"vctk/p228_023.wav","name":"VCTK 228 (UK, f)"},{"path_on_server":"vctk/p229_023.wav"},{"path_on_server":"vctk/p230_023.wav"},{"path_on_server":"vctk/p231_023.wav","name":"VCTK 231 (UK, f)"},{"path_on_server":"vctk/p232_023.wav"},{"path_on_server":"vctk/p233_023.wav"},{"path_on_server":"vctk/p234_023.wav"},{"path_on_server":"vctk/p236_023.wav"},{"path_on_server":"vctk/p237_023.wav"},{"path_on_server":"vctk/p238_023.wav"},{"path_on_server":"vctk/p239_023.wav"},{"path_on_server":"vctk/p240_023.wav"},{"path_on_server":"vctk/p241_023.wav"},{"path_on_server":"vctk/p243_023.wav"},{"path_on_server":"vctk/p244_023.wav"},{"path_on_server":"vctk/p245_023.wav"},{"path_on_server":"vctk/p246_023.wav"},{"path_on_server":"vctk/p247_023.wav"},{"path_on_server":"vctk/p248_023.wav"},{"path_on_server":"vctk/p249_023.wav"},{"path_on_server":"vctk/p250_023.wav"},{"path_on_server":"vctk/p251_023.wav"},{"path_on_server":"vctk/p252_023.wav"},{"path_on_server":"vctk/p253_023.wav"},{"path_on_server":"vctk/p254_023.wav"},{"path_on_server":"vctk/p255_023.wav","name":"VCTK 255 (UK, m)"},{"path_on_server":"vctk/p256_023.wav"},{"path_on_server":"vctk/p257_023.wav"},{"path_on_server":"vctk/p258_023.wav"},{"path_on_server":"vctk/p259_023.wav"},{"path_on_server":"vctk/p260_023.wav"},{"path_on_server":"vctk/p261_023.wav"},{"path_on_server":"vctk/p262_023.wav"},{"path_on_server":"vctk/p263_023.wav"},{"path_on_server":"vctk/p264_023.wav"},{"path_on_server":"vctk/p265_023.wav"},{"path_on_server":"vctk/p266_023.wav"},{"path_on_server":"vctk/p267_023.wav"},{"path_on_server":"vctk/p269_023.wav"},{"path_on_server":"vctk/p270_023.wav"},{"path_on_server":"vctk/p271_023.wav"},{"path_on_server":"vctk/p272_023.wav"},{"path_on_server":"vctk/p273_023.wav"},{"path_on_server":"vctk/p274_023.wav"},{"path_on_server":"vctk/p275_023.wav"},{"path_on_server":"vctk/p276_023.wav"},{"path_on_server":"vctk/p277_023.wav","name":"VCTK 277 (UK, f)"},{"path_on_server":"vctk/p278_023.wav"},{"path_on_server":"vctk/p279_023.wav"},{"path_on_server":"vctk/p280_023.wav"},{"path_on_server":"vctk/p281_023.wav"},{"path_on_server":"vctk/p282_023.wav"},{"path_on_server":"vctk/p283_023.wav"},{"path_on_server":"vctk/p284_023.wav"},{"path_on_server":"vctk/p285_023.wav"},{"path_on_server":"vctk/p286_023.wav"},{"path_on_server":"vctk/p287_023.wav"},{"path_on_server":"vctk/p288_023.wav"},{"path_on_server":"vctk/p292_023.wav","name":"VCTK 292 (UK, m)"},{"path_on_server":"vctk/p293_023.wav"},{"path_on_server":"vctk/p294_023.wav"},{"path_on_server":"vctk/p297_023.wav"},{"path_on_server":"vctk/p298_023.wav"},{"path_on_server":"vctk/p299_023.wav"},{"path_on_server":"vctk/p300_023.wav"},{"path_on_server":"vctk/p301_023.wav"},{"path_on_server":"vctk/p302_023.wav"},{"path_on_server":"vctk/p303_023.wav"},{"path_on_server":"vctk/p304_023.wav"},{"path_on_server":"vctk/p305_023.wav"},{"path_on_server":"vctk/p306_023.wav"},{"path_on_server":"vctk/p307_023.wav"},{"path_on_server":"vctk/p308_023.wav"},{"path_on_server":"vctk/p310_023.wav"},{"path_on_server":"vctk/p311_023.wav"},{"path_on_server":"vctk/p312_023.wav"},{"path_on_server":"vctk/p313_023.wav"},{"path_on_server":"vctk/p314_023.wav"},{"path_on_server":"vctk/p315_023.wav"},{"path_on_server":"vctk/p316_023.wav"},{"path_on_server":"vctk/p317_023.wav"},{"path_on_server":"vctk/p318_023.wav"},{"path_on_server":"vctk/p323_023.wav"},{"path_on_server":"vctk/p326_023.wav"},{"path_on_server":"vctk/p329_023.wav"},{"path_on_server":"vctk/p330_023.wav"},{"path_on_server":"vctk/p333_023.wav"},{"path_on_server":"vctk/p334_023.wav"},{"path_on_server":"vctk/p335_023.wav"},{"path_on_server":"vctk/p336_023.wav"},{"path_on_server":"vctk/p339_023.wav"},{"path_on_server":"vctk/p341_023.wav"},{"path_on_server":"vctk/p343_023.wav"},{"path_on_server":"vctk/p345_023.wav"},{"path_on_server":"vctk/p347_023.wav"},{"path_on_server":"vctk/p351_023.wav"},{"path_on_server":"vctk/p360_023.wav"},{"path_on_server":"vctk/p361_023.wav"},{"path_on_server":"vctk/p363_023.wav"},{"path_on_server":"vctk/p364_023.wav"},{"path_on_server":"vctk/p374_023.wav"},{"path_on_server":"vctk/p376_023.wav"},{"path_on_server":"vctk/s5_023.wav"},{"path_on_server":"ears/p001/freeform_speech_01.wav"},{"path_on_server":"ears/p002/freeform_speech_01.wav"},{"path_on_server":"ears/p003/emo_adoration_freeform.wav"},{"path_on_server":"ears/p003/emo_amazement_freeform.wav"},{"path_on_server":"ears/p003/emo_amusement_freeform.wav"},{"path_on_server":"ears/p003/emo_anger_freeform.wav"},{"path_on_server":"ears/p003/emo_confusion_freeform.wav"},{"path_on_server":"ears/p003/emo_contentment_freeform.wav"},{"path_on_server":"ears/p003/emo_cuteness_freeform.wav"},{"path_on_server":"ears/p003/emo_desire_freeform.wav"},{"path_on_server":"ears/p003/emo_disappointment_freeform.wav"},{"path_on_server":"ears/p003/emo_disgust_freeform.wav"},{"path_on_server":"ears/p003/emo_distress_freeform.wav"},{"path_on_server":"ears/p003/emo_embarassment_freeform.wav"},{"path_on_server":"ears/p003/emo_extasy_freeform.wav"},{"path_on_server":"ears/p003/emo_fear_freeform.wav"},{"path_on_server":"ears/p003/emo_guilt_freeform.wav"},{"path_on_server":"ears/p003/emo_interest_freeform.wav"},{"path_on_server":"ears/p003/emo_neutral_freeform.wav"},{"path_on_server":"ears/p003/emo_pain_freeform.wav"},{"path_on_server":"ears/p003/emo_pride_freeform.wav"},{"path_on_server":"ears/p003/emo_realization_freeform.wav"},{"path_on_server":"ears/p003/emo_relief_freeform.wav"},{"path_on_server":"ears/p003/emo_sadness_freeform.wav"},{"path_on_server":"ears/p003/emo_serenity_freeform.wav"},{"path_on_server":"ears/p003/freeform_speech_01.wav","name":"EARS dataset - Speaker 003"},{"path_on_server":"ears/p004/freeform_speech_01.wav"},{"path_on_server":"ears/p005/freeform_speech_01.wav"},{"path_on_server":"ears/p006/freeform_speech_01.wav"},{"path_on_server":"ears/p007/freeform_speech_01.wav"},{"path_on_server":"ears/p008/freeform_speech_01.wav"},{"path_on_server":"ears/p009/freeform_speech_01.wav"},{"path_on_server":"ears/p010/freeform_speech_01.wav"},{"path_on_server":"ears/p011/freeform_speech_01.wav"},{"path_on_server":"ears/p012/freeform_speech_01.wav"},{"path_on_server":"ears/p013/freeform_speech_01.wav","name":"EARS dataset - Speaker 013"},{"path_on_server":"ears/p014/freeform_speech_01.wav"},{"path_on_server":"ears/p015/freeform_speech_01.wav"},{"path_on_server":"ears/p016/freeform_speech_01.wav"},{"path_on_server":"ears/p017/freeform_speech_01.wav"},{"path_on_server":"ears/p018/freeform_speech_01.wav"},{"path_on_server":"ears/p019/freeform_speech_01.wav"},{"path_on_server":"ears/p020/freeform_speech_01.wav"},{"path_on_server":"ears/p021/freeform_speech_01.wav"},{"path_on_server":"ears/p022/freeform_speech_01.wav","name":"EARS dataset - Speaker 022"},{"path_on_server":"ears/p023/freeform_speech_01.wav"},{"path_on_server":"ears/p024/freeform_speech_01.wav"},{"path_on_server":"ears/p025/freeform_speech_01.wav"},{"path_on_server":"ears/p026/freeform_speech_01.wav"},{"path_on_server":"ears/p027/freeform_speech_01.wav"},{"path_on_server":"ears/p028/freeform_speech_01.wav"},{"path_on_server":"ears/p029/freeform_speech_01.wav"},{"path_on_server":"ears/p030/freeform_speech_01.wav"},{"path_on_server":"ears/p031/emo_adoration_freeform.wav","name":"EARS dataset - Speaker 031"},{"path_on_server":"ears/p031/emo_amazement_freeform.wav"},{"path_on_server":"ears/p031/emo_amusement_freeform.wav"},{"path_on_server":"ears/p031/emo_anger_freeform.wav"},{"path_on_server":"ears/p031/emo_confusion_freeform.wav"},{"path_on_server":"ears/p031/emo_contentment_freeform.wav"},{"path_on_server":"ears/p031/emo_cuteness_freeform.wav"},{"path_on_server":"ears/p031/emo_desire_freeform.wav"},{"path_on_server":"ears/p031/emo_disappointment_freeform.wav"},{"path_on_server":"ears/p031/emo_disgust_freeform.wav"},{"path_on_server":"ears/p031/emo_distress_freeform.wav"},{"path_on_server":"ears/p031/emo_embarassment_freeform.wav"},{"path_on_server":"ears/p031/emo_extasy_freeform.wav"},{"path_on_server":"ears/p031/emo_fear_freeform.wav"},{"path_on_server":"ears/p031/emo_guilt_freeform.wav"},{"path_on_server":"ears/p031/emo_interest_freeform.wav"},{"path_on_server":"ears/p031/emo_neutral_freeform.wav"},{"path_on_server":"ears/p031/emo_pain_freeform.wav"},{"path_on_server":"ears/p031/emo_pride_freeform.wav"},{"path_on_server":"ears/p031/emo_realization_freeform.wav"},{"path_on_server":"ears/p031/emo_relief_freeform.wav"},{"path_on_server":"ears/p031/emo_sadness_freeform.wav"},{"path_on_server":"ears/p031/emo_serenity_freeform.wav"},{"path_on_server":"ears/p031/freeform_speech_01.wav"},{"path_on_server":"ears/p032/freeform_speech_01.wav"},{"path_on_server":"ears/p033/freeform_speech_01.wav"},{"path_on_server":"ears/p034/freeform_speech_01.wav"},{"path_on_server":"ears/p035/freeform_speech_01.wav"},{"path_on_server":"ears/p036/freeform_speech_01.wav"},{"path_on_server":"ears/p037/freeform_speech_01.wav"},{"path_on_server":"ears/p038/freeform_speech_01.wav"},{"path_on_server":"ears/p039/freeform_speech_01.wav"},{"path_on_server":"ears/p040/freeform_speech_01.wav","name":"EARS dataset - Speaker 040"},{"path_on_server":"ears/p041/freeform_speech_01.wav"},{"path_on_server":"ears/p042/freeform_speech_01.wav"},{"path_on_server":"ears/p043/freeform_speech_01.wav"},{"path_on_server":"ears/p044/freeform_speech_01.wav"},{"path_on_server":"ears/p045/freeform_speech_01.wav"},{"path_on_server":"ears/p046/freeform_speech_01.wav"},{"path_on_server":"ears/p047/freeform_speech_01.wav"},{"path_on_server":"ears/p048/freeform_speech_01.wav"},{"path_on_server":"ears/p049/freeform_speech_01.wav"},{"path_on_server":"ears/p050/freeform_speech_01.wav"},{"path_on_server":"ears/p051/freeform_speech_01.wav","name":"EARS dataset - Speaker 051"},{"path_on_server":"ears/p052/freeform_speech_01.wav"},{"path_on_server":"ears/p053/freeform_speech_01.wav"},{"path_on_server":"ears/p054/freeform_speech_01.wav"},{"path_on_server":"ears/p055/freeform_speech_01.wav"},{"path_on_server":"ears/p056/freeform_speech_01.wav"},{"path_on_server":"ears/p057/freeform_speech_01.wav"},{"path_on_server":"ears/p058/freeform_speech_01.wav"},{"path_on_server":"ears/p059/freeform_speech_01.wav"},{"path_on_server":"ears/p060/freeform_speech_01.wav","name":"EARS dataset - Speaker 060"},{"path_on_server":"ears/p061/freeform_speech_01.wav"},{"path_on_server":"ears/p062/freeform_speech_01.wav"},{"path_on_server":"ears/p063/freeform_speech_01.wav"},{"path_on_server":"ears/p064/freeform_speech_01.wav"},{"path_on_server":"ears/p065/freeform_speech_01.wav"},{"path_on_server":"ears/p066/freeform_speech_01.wav"},{"path_on_server":"ears/p067/freeform_speech_01.wav"},{"path_on_server":"ears/p068/freeform_speech_01.wav"},{"path_on_server":"ears/p069/freeform_speech_01.wav"},{"path_on_server":"ears/p070/freeform_speech_01.wav","name":"EARS dataset - Speaker 070"},{"path_on_server":"ears/p071/freeform_speech_01.wav"},{"path_on_server":"ears/p072/freeform_speech_01.wav"},{"path_on_server":"ears/p073/freeform_speech_01.wav"},{"path_on_server":"ears/p074/freeform_speech_01.wav"},{"path_on_server":"ears/p075/freeform_speech_01.wav"},{"path_on_server":"ears/p076/freeform_speech_01.wav"},{"path_on_server":"ears/p077/freeform_speech_01.wav"},{"path_on_server":"ears/p078/freeform_speech_01.wav"},{"path_on_server":"ears/p079/freeform_speech_01.wav"},{"path_on_server":"ears/p080/freeform_speech_01.wav","name":"EARS dataset - Speaker 080"},{"path_on_server":"ears/p081/freeform_speech_01.wav"},{"path_on_server":"ears/p082/freeform_speech_01.wav"},{"path_on_server":"ears/p083/freeform_speech_01.wav"},{"path_on_server":"ears/p084/freeform_speech_01.wav"},{"path_on_server":"ears/p085/freeform_speech_01.wav"},{"path_on_server":"ears/p086/freeform_speech_01.wav"},{"path_on_server":"ears/p087/freeform_speech_01.wav"},{"path_on_server":"ears/p088/freeform_speech_01.wav"},{"path_on_server":"ears/p089/freeform_speech_01.wav"},{"path_on_server":"ears/p090/freeform_speech_01.wav"},{"path_on_server":"ears/p091/freeform_speech_01.wav","name":"EARS dataset - Speaker 091"},{"path_on_server":"ears/p092/freeform_speech_01.wav"},{"path_on_server":"ears/p093/freeform_speech_01.wav"},{"path_on_server":"ears/p094/freeform_speech_01.wav"},{"path_on_server":"ears/p095/freeform_speech_01.wav"},{"path_on_server":"ears/p096/freeform_speech_01.wav"},{"path_on_server":"ears/p097/freeform_speech_01.wav"},{"path_on_server":"ears/p098/freeform_speech_01.wav"},{"path_on_server":"ears/p099/freeform_speech_01.wav"},{"path_on_server":"ears/p100/freeform_speech_01.wav"},{"path_on_server":"ears/p101/freeform_speech_01.wav"},{"path_on_server":"ears/p102/freeform_speech_01.wav"},{"path_on_server":"ears/p103/freeform_speech_01.wav"},{"path_on_server":"ears/p104/freeform_speech_01.wav"},{"path_on_server":"ears/p105/freeform_speech_01.wav","name":"EARS dataset - Speaker 105"},{"path_on_server":"ears/p106/freeform_speech_01.wav"},{"path_on_server":"ears/p107/freeform_speech_01.wav"}]');
const manualMsgPack = {
  encodeString(str) {
    const len = Buffer.byteLength(str, "utf8");
    if (len < 32) {
      const h = Buffer.from([160 | len]);
      return Buffer.concat([h, Buffer.from(str)]);
    }
    if (len < 256) {
      const h = Buffer.from([217, len]);
      return Buffer.concat([h, Buffer.from(str)]);
    }
    if (len < 65536) {
      const h = Buffer.alloc(3);
      h[0] = 218;
      h.writeUInt16BE(len, 1);
      return Buffer.concat([h, Buffer.from(str)]);
    }
    const h = Buffer.alloc(5);
    h[0] = 219;
    h.writeUInt32BE(len, 1);
    return Buffer.concat([h, Buffer.from(str)]);
  },
  encode(obj) {
    if (obj.type === "Text") {
      return Buffer.concat([Buffer.from([130]), this.encodeString("type"), this.encodeString("Text"), this.encodeString("text"), this.encodeString(obj.text)]);
    }
    if (obj.type === "Eos") {
      return Buffer.concat([Buffer.from([129]), this.encodeString("type"), this.encodeString("Eos")]);
    }
    return null;
  },
  decode(buffer) {
    let offset = 0;
    const parseValue = () => {
      if (offset >= buffer.length) throw new Error("Offset out of bounds");
      const type = buffer[offset++];
      if (type >= 0 && type <= 127) return type;
      if (type >= 128 && type <= 143) {
        const len = type & 15;
        const obj = {};
        for (let i = 0; i < len; i++) {
          const key = parseValue();
          obj[key] = parseValue();
        }
        return obj;
      }
      if (type >= 144 && type <= 159) {
        const len = type & 15;
        const arr = [];
        for (let i = 0; i < len; i++) arr.push(parseValue());
        return arr;
      }
      if (type >= 160 && type <= 191) {
        const len = type & 31;
        const str = buffer.toString("utf8", offset, offset + len);
        offset += len;
        return str;
      }
      if (type >= 224 && type <= 255) return type - 256;
      switch (type) {
        case 202: {
          const val = buffer.readFloatBE(offset);
          offset += 4;
          return val;
        }
        case 203: {
          const val = buffer.readDoubleBE(offset);
          offset += 8;
          return val;
        }
        case 220: {
          const len = buffer.readUInt16BE(offset);
          offset += 2;
          const arr = [];
          for (let i = 0; i < len; i++) arr.push(parseValue());
          return arr;
        }
      }
      return null;
    };
    try {
      return parseValue();
    } catch (e) {
      return null;
    }
  }
};
class TtsService {
  constructor(config = {}) {
    console.log("Proses: Inisialisasi TtsService...");
    this.baseUrl = config.baseUrl || "wss://unmute.sh/tts-server/api/tts_streaming";
    this.defaultHeaders = {
      Origin: "https://kyutai.org",
      "User-Agent": "Node.js Full JS Client"
    };
  }
  _createWavBuffer(samples) {
    const sampleRate = 24e3;
    const numChannels = 1;
    const bytesPerSample = 2;
    const dataSize = samples.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write("RIFF", 0, "ascii");
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8, "ascii");
    buffer.write("fmt ", 12, "ascii");
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36, "ascii");
    buffer.writeUInt32LE(dataSize, 40);
    let offset = 44;
    for (const sample of samples) {
      const s = Math.max(-1, Math.min(1, sample));
      const intValue = s < 0 ? s * 32768 : s * 32767;
      buffer.writeInt16LE(intValue, offset);
      offset += 2;
    }
    return buffer;
  }
  voice_list() {
    return voiceList;
  }
  async generate({
    text,
    ...rest
  }) {
    console.log("Proses: Memulai generate audio...");
    if (!text) {
      console.error("Kesalahan: Teks input tidak boleh kosong.");
      return null;
    }
    try {
      const params = {
        voice: rest.voice || "expresso/ex03-ex01_laughing_001_channel1_188s.wav",
        cfg_alpha: 1.5,
        format: "PcmMessagePack",
        auth_id: "public_token",
        request_id: Date.now()
      };
      const url = new URL(this.baseUrl);
      url.search = new URLSearchParams(params).toString();
      console.log(`Proses: Menghubungi server di ${this.baseUrl}`);
      const pcmFloats = await new Promise((resolve, reject) => {
        const ws = new WebSocket(url.toString(), {
          headers: this.defaultHeaders
        });
        const audioSamples = [];
        ws.on("open", () => {
          console.log("Log: Koneksi WebSocket terbuka. Mengirim data...");
          ws.send(manualMsgPack.encode({
            type: "Text",
            text: text
          }));
          ws.send(manualMsgPack.encode({
            type: "Eos"
          }));
        });
        ws.on("message", data => {
          const decodedMsg = manualMsgPack.decode(data);
          if (!decodedMsg || typeof decodedMsg !== "object") return;
          switch (decodedMsg.type) {
            case "Audio":
              if (Array.isArray(decodedMsg.pcm)) {
                audioSamples.push(...decodedMsg.pcm);
              }
              break;
            case "Text":
              console.log(`Log: Menerima metadata: (kata "${decodedMsg.text}")`);
              break;
            case "Error":
              console.error(`Error dari server: ${decodedMsg.message}`);
              break;
          }
        });
        ws.on("close", code => {
          console.log(`Log: Koneksi ditutup. Kode: ${code}. Total sampel audio: ${audioSamples.length}.`);
          if (audioSamples.length > 0) {
            resolve(audioSamples);
          } else {
            reject(new Error("Proses selesai tetapi tidak ada data audio yang diterima."));
          }
        });
        ws.on("error", err => reject(err));
      });
      console.log("Proses: Mengonversi sampel audio ke format WAV...");
      const wavBuffer = this._createWavBuffer(pcmFloats);
      console.log("Proses: Selesai. Meng-upload.");
      return await this.uploadAudio(wavBuffer);
    } catch (error) {
      console.error(`Terjadi kesalahan fatal: ${error.message}`);
      return null;
    }
  }
  async uploadAudio(audioBuffer) {
    const uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    console.log(`\nProses: Mengupload audio ke ${uploadUrl}...`);
    try {
      const form = new FormData();
      form.append("file", audioBuffer, {
        filename: "audio.mp3",
        contentType: "audio/mpeg"
      });
      const response = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      if (response.data) {
        console.log("Upload berhasil!");
        return response.data;
      } else {
        console.error(`Gagal mengupload. Status: ${response.status}`, response.data);
        return null;
      }
    } catch (error) {
      console.error(`Terjadi kesalahan fatal saat upload: ${error.message}`);
      return null;
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
      error: "Missing required field: action",
      required: {
        action: "generate | voice_list"
      }
    });
  }
  const mic = new TtsService();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      case "voice_list":
        result = mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate | voice_list`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}