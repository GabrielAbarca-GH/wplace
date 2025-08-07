(async () => {
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    THEME: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      text: '#ffffff',
      highlight: '#775ce3',
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffaa00'
    }
  };

  const TEXTS = {
    pt: {
      title: "WPlace Auto-Image",
      initBot: "Iniciar Auto-BOT",
      uploadImage: "Upload da Imagem",
      resizeImage: "Redimensionar Imagem",
      selectPosition: "Selecionar Posição",
      startPainting: "Iniciar Pintura",
      stopPainting: "Parar Pintura",
      checkingColors: "🔍 Verificando cores disponíveis...",
      noColorsFound: "❌ Abra a paleta de cores no site e tente novamente!",
      colorsFound: "✅ {count} cores disponíveis encontradas",
      loadingImage: "🖼️ Carregando imagem...",
      imageLoaded: "✅ Imagem carregada com {count} pixels válidos",
      imageError: "❌ Erro ao carregar imagem",
      selectPositionAlert: "Pinte o primeiro pixel na localização onde deseja que a arte comece!",
      waitingPosition: "👆 Aguardando você pintar o pixel de referência...",
      positionSet: "✅ Posição definida com sucesso!",
      positionTimeout: "❌ Tempo esgotado para selecionar posição",
      startPaintingMsg: "🎨 Iniciando pintura...",
      paintingProgress: "🧱 Progresso: {painted}/{total} pixels...",
      noCharges: "⌛ Sem cargas. Aguardando {time}...",
      paintingStopped: "⏹️ Pintura interrompida pelo usuário",
      paintingComplete: "✅ Pintura concluída! {count} pixels pintados.",
      paintingError: "❌ Erro durante a pintura",
      missingRequirements: "❌ Carregue uma imagem e selecione uma posição primeiro",
      progress: "Progresso",
      pixels: "Pixels",
      charges: "Cargas",
      estimatedTime: "Tempo estimado",
      initMessage: "Clique em 'Iniciar Auto-BOT' para começar",
      waitingInit: "Aguardando inicialização...",
      resizeSuccess: "✅ Imagem redimensionada para {width}x{height}",
      paintingPaused: "⏸️ Pintura pausada na posição X: {x}, Y: {y}"
    },
    en: {
      title: "WPlace Auto-Image",
      initBot: "Start Auto-BOT",
      uploadImage: "Upload Image",
      resizeImage: "Resize Image",
      selectPosition: "Select Position",
      startPainting: "Start Painting",
      stopPainting: "Stop Painting",
      checkingColors: "🔍 Checking available colors...",
      noColorsFound: "❌ Open the color palette on the site and try again!",
      colorsFound: "✅ {count} available colors found",
      loadingImage: "🖼️ Loading image...",
      imageLoaded: "✅ Image loaded with {count} valid pixels",
      imageError: "❌ Error loading image",
      selectPositionAlert: "Paint the first pixel at the location where you want the art to start!",
      waitingPosition: "👆 Waiting for you to paint the reference pixel...",
      positionSet: "✅ Position set successfully!",
      positionTimeout: "❌ Timeout for position selection",
      startPaintingMsg: "🎨 Starting painting...",
      paintingProgress: "🧱 Progress: {painted}/{total} pixels...",
      noCharges: "⌛ No charges. Waiting {time}...",
      paintingStopped: "⏹️ Painting stopped by user",
      paintingComplete: "✅ Painting complete! {count} pixels painted.",
      paintingError: "❌ Error during painting",
      missingRequirements: "❌ Load an image and select a position first",
      progress: "Progress",
      pixels: "Pixels",
      charges: "Charges",
      estimatedTime: "Estimated time",
      initMessage: "Click 'Start Auto-BOT' to begin",
      waitingInit: "Waiting for initialization...",
      resizeSuccess: "✅ Image resized to {width}x{height}",
      paintingPaused: "⏸️ Painting paused at position X: {x}, Y: {y}"
    }
  };

  const state = {
    running: false,
    imageLoaded: false,
    processing: false,
    totalPixels: 0,
    paintedPixels: 0,
    availableColors: [],
    currentCharges: 0,
    cooldown: CONFIG.COOLDOWN_DEFAULT,
    imageData: null,
    stopFlag: false,
    colorsChecked: false,
    startPosition: null,
    selectingPosition: false,
    region: null,
    minimized: false,
    lastPosition: { x: 0, y: 0 },
    estimatedTime: 0,
    language: 'en'
  };

  async function detectLanguage() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      state.language = data.country === 'BR' ? 'pt' : 'en';
      return state.language;
    } catch {
      state.language = 'en';
      return 'en';
    }
  }

  const Utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    colorDistance: (a, b) => Math.sqrt(
      Math.pow(a[0] - b[0], 2) +
      Math.pow(a[1] - b[1], 2) +
      Math.pow(a[2] - b[2], 2)
    ),
    createImageUploader: () => new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg';
      input.onchange = () => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(input.files[0]);
      };
      input.click();
    }),
    extractAvailableColors: () => {
      const colorElements = document.querySelectorAll('[id^="color-"]');
      return Array.from(colorElements)
        .filter(el => !el.querySelector('svg'))
        .filter(el => {
          const id = parseInt(el.id.replace('color-', ''));
          return id !== 0 && id !== 5;
        })
        .map(el => {
          const id = parseInt(el.id.replace('color-', ''));
          const rgbStr = el.style.backgroundColor.match(/\d+/g);
          const rgb = rgbStr ? rgbStr.map(Number) : [0, 0, 0];
          return { id, rgb };
        });
    },
    formatTime: ms => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      return result;
    },
    showAlert: (message, type = 'info') => {
      const alert = document.createElement('div');
      alert.style.position = 'fixed';
      alert.style.top = '20px';
      alert.style.left = '50%';
      alert.style.transform = 'translateX(-50%)';
      alert.style.padding = '15px 20px';
      alert.style.background = CONFIG.THEME[type] || CONFIG.THEME.accent;
      alert.style.color = CONFIG.THEME.text;
      alert.style.borderRadius = '5px';
      alert.style.zIndex = '10000';
      alert.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
      alert.style.display = 'flex';
      alert.style.alignItems = 'center';
      alert.style.gap = '10px';
      const icons = { error: 'exclamation-circle', success: 'check-circle', warning: 'exclamation-triangle', info: 'info-circle' };
      alert.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i><span>${message}</span>`;
      document.body.appendChild(alert);
      setTimeout(() => { alert.style.opacity = '0'; alert.style.transition = 'opacity 0.5s'; setTimeout(() => alert.remove(), 500); }, 3000);
    },
    calculateEstimatedTime: (remainingPixels, currentCharges, cooldown) => {
      const pixelsPerCharge = currentCharges > 0 ? currentCharges : 0;
      const fullCycles = Math.ceil((remainingPixels - pixelsPerCharge) / Math.max(currentCharges, 1));
      return (fullCycles * cooldown) + ((remainingPixels - 1) * 100);
    },
    isWhitePixel: (r, g, b) => {
      return r >= CONFIG.WHITE_THRESHOLD && g >= CONFIG.WHITE_THRESHOLD && b >= CONFIG.WHITE_THRESHOLD;
    },
    t: (key, params = {}) => {
      let text = TEXTS[state.language][key] || TEXTS.en[key] || key;
      for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v);
      return text;
    }
  };

  const WPlaceService = {
    async paintPixelInRegion(regionX, regionY, pixelX, pixelY, color) {
      try {
        const res = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, { method: 'POST', headers: {'Content-Type':'text/plain;charset=UTF-8'}, credentials:'include', body: JSON.stringify({ coords:[pixelX,pixelY], colors:[color] }) });
        const data = await res.json();
        return data?.painted===1;
      } catch { return false; }
    },
    async getCharges() {
      try { const res = await fetch('https://backend.wplace.live/me',{credentials:'include'}); const data=await res.json(); return {charges:data.charges?.count||0, cooldown:data.charges?.cooldownMs||CONFIG.COOLDOWN_DEFAULT}; } catch { return {charges:0, cooldown:CONFIG.COOLDOWN_DEFAULT}; }
    }
  };

  class ImageProcessor {
    constructor(src){ this.imageSrc=src; this.img=new Image(); this.canvas=document.createElement('canvas'); this.ctx=this.canvas.getContext('2d'); this.previewCanvas=document.createElement('canvas'); this.previewCtx=this.previewCanvas.getContext('2d'); }
    async load(){ return new Promise((resolve,reject)=>{ this.img.onload=()=>{ this.canvas.width=this.img.width; this.canvas.height=this.img.height; this.ctx.drawImage(this.img,0,0); resolve(); }; this.img.onerror=reject; this.img.src=this.imageSrc; }); }
    getPixelData(){ return this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height).data; }
    getDimensions(){ return {width:this.canvas.width, height:this.canvas.height}; }
    resize(w,h){ const t=document.createElement('canvas'); t.width=w; t.height=h; const c=t.getContext('2d'); c.drawImage(this.img,0,0,w,h); this.canvas.width=w; this.canvas.height=h; this.ctx.drawImage(t,0,0); return this.getPixelData(); }
    generatePreview(w,h){ this.previewCanvas.width=w; this.previewCanvas.height=h; this.previewCtx.imageSmoothingEnabled=false; this.previewCtx.drawImage(this.img,0,0,w,h); return this.previewCanvas.toDataURL(); }
  }

  function findClosestColor(rgb,palette){ return palette.reduce((cur,cur2)=>{ const d=Utils.colorDistance(rgb,cur2.rgb); return d<cur.distance?{color:cur2,distance:d}:cur; },{color:palette[0],distance:Utils.colorDistance(rgb,palette[0].rgb)}).color.id; }

  function getCurrentColorId(regionX,regionY,x,y){ const canvas=document.querySelector(`#region-${regionX}-${regionY} canvas`); if(!canvas) return null; const ctx=canvas.getContext('2d'); const d=ctx.getImageData(x,y,1,1).data; return findClosestColor([d[0],d[1],d[2]], state.availableColors); }

  async function createUI(){
    await detectLanguage();
    // todo: inserir aqui todo o HTML/CSS/JS de UI conforme o código original
    // (aqui vai o bloco inteiro de createUI() do script não modificado)
    // para não poluir, copie exatamente do seu script original.
  }

  async function processImage(){
    const {width,height,pixels} = state.imageData;
    const {x:startX,y:startY} = state.startPosition;
    const {x:regionX,y:regionY} = state.region;
    let startRow = state.lastPosition.y||0;
    let startCol = state.lastPosition.x||0;
    outerLoop:
    for(let y=startRow; y<height; y++){
      for(let x=(y===startRow?startCol:0); x<width; x++){
        if(state.stopFlag){ state.lastPosition={x,y}; updateUI('paintingPaused','warning',{x,y}); break outerLoop; }
        const idx=(y*width+x)*4;
        const r=pixels[idx],g=pixels[idx+1],b=pixels[idx+2],alpha=pixels[idx+3];
        if(alpha<CONFIG.TRANSPARENCY_THRESHOLD) continue;
        if(Utils.isWhitePixel(r,g,b)) continue;
        const rgb=[r,g,b];
        const desiredColorId=findClosestColor(rgb,state.availableColors);
        const currentColorId=getCurrentColorId(regionX,regionY,startX+x,startY+y);
        if(currentColorId===desiredColorId){ state.paintedPixels++; if(state.paintedPixels%CONFIG.LOG_INTERVAL===0) updateStats(); continue; }
        if(state.currentCharges<1){ updateUI('noCharges','warning',{time:Utils.formatTime(state.cooldown)}); await Utils.sleep(state.cooldown); const ch=await WPlaceService.getCharges(); state.currentCharges=ch.charges; state.cooldown=ch.cooldown; }
        const pixelX=startX+x,pixelY=startY+y;
        const success=await WPlaceService.paintPixelInRegion(regionX,regionY,pixelX,pixelY,desiredColorId);
        if(success){ state.paintedPixels++; state.currentCharges--; state.estimatedTime=Utils.calculateEstimatedTime(state.totalPixels-state.paintedPixels,state.currentCharges,state.cooldown); if(state.paintedPixels%CONFIG.LOG_INTERVAL===0){ updateStats(); updateUI('paintingProgress','default',{painted:state.paintedPixels,total:state.totalPixels}); } }
      }
    }
    if(state.stopFlag) updateUI('paintingStopped','warning'); else{ updateUI('paintingComplete','success',{count:state.paintedPixels}); state.lastPosition={x:0,y:0}; }
    updateStats();
  }

  createUI();
})();
