const viralPrompts = [{
  name: "Realistic Figurine on Desk",
  category: "Realism & Photography",
  text: "A commercial product shot of a 1/7 scale figurine of an anime character, showcasing a highly realistic style and environment. The figurine is placed on a computer desk with a round, transparent acrylic base with no text. The computer screen in the background displays the Zbrush modeling process of the figurine. Next to it, there's a BANDAI-style toy box with the original illustration printed on it. Professional studio lighting, sharp details, 8K resolution."
}, {
  name: "Epic Cinematic Overlook",
  category: "Realism & Photography",
  text: "An epic cinematic still from a blockbuster film. A lone hero stands on a cliff's edge overlooking a futuristic city at dusk. Shot on Panavision anamorphic lenses, creating beautiful lens flares and a wide aspect ratio. Moody, dramatic lighting with deep shadows and vibrant neon highlights reflecting on wet pavement. Ultra-realistic, hyperdetailed, 8K, color graded with teal and orange tones."
}, {
  name: "Authentic 80s Arcade Photo",
  category: "Realism & Photography",
  text: "An authentic photograph from the 1980s. A group of friends laughing in a vintage video game arcade. The image has a soft focus, noticeable film grain, and light leaks in the corners. Colors are slightly faded with a warm, nostalgic yellow tint, reminiscent of a disposable camera photo. Shot on Kodak Portra 400 film, candid, retro vibe."
}, {
  name: "Extreme Macro Dewdrop",
  category: "Realism & Photography",
  text: "Extreme macro photograph of a dewdrop on a spiderweb. Intricate details of the web's silk threads are visible, with the background beautifully blurred with bokeh. The dewdrop refracts a miniature version of a sunrise. Hyper-realistic, tack-sharp focus, shot with a 100mm macro lens, natural morning light."
}, {
  name: "Neon-Soaked Cyberpunk Alley",
  category: "Digital Art & Fantasy",
  text: "A gritty, rain-slicked alley in a cyberpunk metropolis, inspired by Blade Runner. A mysterious figure in a high-tech trench coat is illuminated by holographic advertisements and the glow of neon signs. Volumetric lighting cuts through the dense fog. Intricate details on cybernetic enhancements and weathered surfaces. Rendered in Unreal Engine 5, hyper-realistic, with ray tracing reflections."
}, {
  name: "Isometric RPG Tavern Room",
  category: "Digital Art & Fantasy",
  text: "An isometric, low-poly 3D render of a cozy fantasy tavern room. A crackling fireplace, a wooden table with potion bottles and a map, and a treasure chest in the corner. Pixel art textures, vibrant colors, and a clean, stylized look reminiscent of a classic RPG video game like Diablo or Baldur's Gate."
}, {
  name: "Enchanted Forest Storybook",
  category: "Digital Art & Fantasy",
  text: "A whimsical and enchanting fantasy storybook illustration. A glowing, enchanted forest where oversized, bioluminescent mushrooms light up a path for a small, brave adventurer. Soft, textured brush strokes, a rich and magical color palette. In the style of classic fairy tale art, highly detailed and charming."
}, {
  name: "Studio Ghibli Landscape",
  category: "Traditional & Artistic Styles",
  text: "A serene and beautiful landscape in the signature style of Studio Ghibli. Lush, rolling green hills, a crystal-clear stream, and whimsical, cloud-filled skies. Soft, painterly textures and a warm, inviting color palette. Hand-drawn aesthetic with clean lines and incredible attention to natural detail."
}, {
  name: "90s Retro Mecha Anime",
  category: "Traditional & Artistic Styles",
  text: "A dynamic action scene in the style of a 90s mecha anime like Evangelion or Akira. Cel-shaded characters with sharp, angular designs and expressive faces. Gritty, detailed backgrounds with a slightly muted color palette. Visible film grain and a 4:3 aspect ratio to complete the retro aesthetic."
}, {
  name: "Baroque Oil Painting Feast",
  category: "Traditional & Artistic Styles",
  text: "An oil painting of a royal feast in the opulent Baroque style of Caravaggio. Dramatic chiaroscuro lighting creates intense contrast between light and shadow. Rich, deep colors, lavish details on fabrics and food, and dynamic, emotional figures. Hyper-realistic, painterly, a masterpiece."
}, {
  name: "Vintage Comic Book Panel",
  category: "Traditional & Artistic Styles",
  text: "A panel from a 1960s vintage comic book. A superhero with a determined expression, rendered in the classic style with Ben-Day dots for shading. Bold black outlines, a limited but vibrant color palette (reds, yellows, blues). The caption box contains dramatic, exclamatory text. Papery texture."
}, {
  name: "Claymation Bakery Diorama",
  category: "Unique & Creative",
  text: "A charming diorama of a whimsical animal bakery, created in the style of Aardman Animations (Wallace and Gromit). Every character and object is meticulously crafted from clay, showing visible fingerprints and textures. Warm, gentle lighting from miniature lamps. Stop-motion animation aesthetic, cozy and highly detailed."
}, {
  name: "Steampunk Dragon Blueprint",
  category: "Unique & Creative",
  text: "A detailed technical blueprint schematic of a complex steampunk clockwork dragon. White lines and annotations on a deep blue background. Shows internal gears, steam pipes, and mechanical joints with precise measurements and callouts. Clean, technical, and highly detailed."
}];
const randomIndex = Math.floor(Math.random() * viralPrompts.length);
const randomPromptObject = viralPrompts[randomIndex];
console.log(`Prompt Name: ${randomPromptObject.name}`);
export default randomPromptObject;