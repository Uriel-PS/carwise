import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Use service role for bulk insert (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client-side supabase for auth verification
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// R2 (Cloudflare) client — same config as upload-foto
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Converte links de compartilhamento (Google Drive, etc) para links diretos de download.
 */
function obterLinkDireto(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'drive.google.com') {
      let fileId = null;
      // Formato: /file/d/FILE_ID/view
      const match = parsed.pathname.match(/\/file\/d\/([^\/]+)/);
      if (match) {
        fileId = match[1];
      } else if (parsed.searchParams.has('id')) {
        // Formato: /open?id=FILE_ID
        fileId = parsed.searchParams.get('id');
      }
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
  } catch (e) {
    // URL inválida, ignora
  }
  return url;
}

/**
 * Downloads an image from an external URL and re-uploads it to R2.
 * Returns the permanent R2 public URL, or null if download/upload fails.
 */
async function baixarEResubirFoto(urlExterna) {
  try {
    const linkDireto = obterLinkDireto(urlExterna);
    
    const response = await fetch(linkDireto, { 
      signal: AbortSignal.timeout(15000) // 15s timeout per image
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Max 5MB per image (same limit as upload-foto)
    if (buffer.length > 5 * 1024 * 1024) return null;

    // Generate unique filename
    const uniqueId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const extensionMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extensionMap[contentType] || 'jpg';
    const fileName = `veiculos/${uniqueId}.${ext}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    }));

    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
  } catch (err) {
    console.error(`Falha ao baixar/resubir foto: ${urlExterna}`, err.message);
    return null;
  }
}

const CAMBIOS_VALIDOS = ['Automático', 'Manual', 'CVT', 'Automatizado'];
const COMBUSTIVEIS_VALIDOS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'];
const CATEGORIAS_VALIDAS = ['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Luxo'];
const MAX_VEICULOS = 500;

function validarVeiculo(v, index) {
  const erros = [];
  const linha = index + 2; // +2 because header is row 1, and index is 0-based

  if (!v.marca || !v.marca.trim()) erros.push(`Linha ${linha}: "marca" é obrigatório.`);
  if (!v.modelo || !v.modelo.trim()) erros.push(`Linha ${linha}: "modelo" é obrigatório.`);
  if (!v.preco && v.preco !== 0) erros.push(`Linha ${linha}: "preco" é obrigatório.`);

  if (v.preco !== null && v.preco !== undefined && v.preco !== '') {
    const preco = Number(v.preco);
    if (isNaN(preco) || preco <= 0) erros.push(`Linha ${linha}: "preco" deve ser um número positivo.`);
  }

  if (v.preco_negociacao !== null && v.preco_negociacao !== undefined && v.preco_negociacao !== '') {
    const pn = Number(v.preco_negociacao);
    if (isNaN(pn) || pn <= 0) erros.push(`Linha ${linha}: "preco_negociacao" deve ser um número positivo.`);
  }

  if (v.km !== null && v.km !== undefined && v.km !== '') {
    const km = Number(v.km);
    if (isNaN(km) || km < 0) erros.push(`Linha ${linha}: "km" deve ser um número >= 0.`);
  }

  if (v.ano_fabricacao !== null && v.ano_fabricacao !== undefined && v.ano_fabricacao !== '') {
    const af = Number(v.ano_fabricacao);
    if (isNaN(af) || af < 1900 || af > 2030) erros.push(`Linha ${linha}: "ano_fabricacao" inválido.`);
  }

  if (v.ano_modelo !== null && v.ano_modelo !== undefined && v.ano_modelo !== '') {
    const am = Number(v.ano_modelo);
    if (isNaN(am) || am < 1900 || am > 2030) erros.push(`Linha ${linha}: "ano_modelo" inválido.`);
  }

  if (v.cambio && !CAMBIOS_VALIDOS.includes(v.cambio)) {
    erros.push(`Linha ${linha}: "cambio" inválido. Use: ${CAMBIOS_VALIDOS.join(', ')}.`);
  }

  if (v.combustivel && !COMBUSTIVEIS_VALIDOS.includes(v.combustivel)) {
    erros.push(`Linha ${linha}: "combustivel" inválido. Use: ${COMBUSTIVEIS_VALIDOS.join(', ')}.`);
  }

  if (v.categoria && !CATEGORIAS_VALIDAS.includes(v.categoria)) {
    erros.push(`Linha ${linha}: "categoria" inválida. Use: ${CATEGORIAS_VALIDAS.join(', ')}.`);
  }

  // Validate photo URLs
  const fotoKeys = ['foto_1', 'foto_2', 'foto_3', 'foto_4'];
  fotoKeys.forEach((key) => {
    if (v[key] && v[key].trim()) {
      try {
        new URL(v[key].trim());
      } catch {
        erros.push(`Linha ${linha}: "${key}" não é uma URL válida.`);
      }
    }
  });

  return erros;
}

function normalizarVeiculo(v) {
  return {
    marca: (v.marca || '').trim(),
    modelo: (v.modelo || '').trim(),
    versao: (v.versao || '').trim() || null,
    ano_fabricacao: v.ano_fabricacao ? Number(v.ano_fabricacao) : null,
    ano_modelo: v.ano_modelo ? Number(v.ano_modelo) : null,
    cor: (v.cor || '').trim() || null,
    cambio: v.cambio || 'Automático',
    combustivel: v.combustivel || 'Flex',
    categoria: v.categoria || 'Hatch',
    km: v.km ? Number(v.km) : null,
    preco: v.preco ? Number(v.preco) : null,
    preco_negociacao: v.preco_negociacao ? Number(v.preco_negociacao) : null,
    status: 'ativo',
  };
}

export async function POST(request) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    // 2. Get concessionaria
    const { data: concessionaria, error: concError } = await supabaseAdmin
      .from('concessionarias')
      .select('id')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle();

    if (concError || !concessionaria) {
      return NextResponse.json({ error: 'Concessionária não encontrada.' }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const { veiculos } = body;

    if (!Array.isArray(veiculos) || veiculos.length === 0) {
      return NextResponse.json({ error: 'Nenhum veículo enviado.' }, { status: 400 });
    }

    if (veiculos.length > MAX_VEICULOS) {
      return NextResponse.json({ 
        error: `Limite máximo de ${MAX_VEICULOS} veículos por importação excedido. Você enviou ${veiculos.length}.` 
      }, { status: 400 });
    }

    // 4. Validate all vehicles
    const todosErros = [];
    veiculos.forEach((v, i) => {
      const erros = validarVeiculo(v, i);
      todosErros.push(...erros);
    });

    if (todosErros.length > 0) {
      return NextResponse.json({ 
        error: 'Erros de validação encontrados.',
        erros: todosErros,
        total_erros: todosErros.length
      }, { status: 400 });
    }

    // 5. Insert vehicles in batch
    const veiculosNormalizados = veiculos.map(v => ({
      ...normalizarVeiculo(v),
      concessionaria_id: concessionaria.id,
    }));

    const { data: inseridos, error: insertError } = await supabaseAdmin
      .from('veiculos')
      .insert(veiculosNormalizados)
      .select('id');

    if (insertError) {
      console.error('Erro ao inserir veículos:', insertError);
      return NextResponse.json({ 
        error: `Erro ao inserir veículos: ${insertError.message}` 
      }, { status: 500 });
    }

    // 6. Download external photos, re-upload to R2, and save to DB
    let fotosInseridas = 0;
    let fotosFalharam = 0;

    // Collect all photo tasks
    const fotoTasks = [];
    inseridos.forEach((veiculoInserido, index) => {
      const veiculoOriginal = veiculos[index];
      const fotoKeys = ['foto_1', 'foto_2', 'foto_3', 'foto_4'];
      
      fotoKeys.forEach((key, ordem) => {
        const urlExterna = veiculoOriginal[key]?.trim();
        if (urlExterna) {
          fotoTasks.push({ veiculoId: veiculoInserido.id, urlExterna, ordem });
        }
      });
    });

    // Process photos in parallel batches of 5 (avoid overwhelming the server)
    const BATCH_SIZE = 5;
    for (let i = 0; i < fotoTasks.length; i += BATCH_SIZE) {
      const batch = fotoTasks.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(async (task) => {
          // Download from external URL and re-upload to R2
          const r2Url = await baixarEResubirFoto(task.urlExterna);
          if (!r2Url) return null;

          // Save R2 URL (not the external URL) in the database
          const { error } = await supabaseAdmin
            .from('veiculo_fotos')
            .insert({
              veiculo_id: task.veiculoId,
              url: r2Url,
              ordem: task.ordem,
            });

          if (error) {
            console.error(`Erro ao salvar foto no banco (veículo ${task.veiculoId}, ordem ${task.ordem}):`, error.message);
            return null;
          }

          return r2Url;
        })
      );

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          fotosInseridas++;
        } else {
          fotosFalharam++;
        }
      });
    }

    return NextResponse.json({
      sucesso: true,
      total_importados: inseridos.length,
      total_fotos: fotosInseridas,
      total_fotos_falha: fotosFalharam,
      mensagem: `${inseridos.length} veículo${inseridos.length !== 1 ? 's' : ''} importado${inseridos.length !== 1 ? 's' : ''} com sucesso!${fotosInseridas > 0 ? ` ${fotosInseridas} foto${fotosInseridas !== 1 ? 's' : ''} importada${fotosInseridas !== 1 ? 's' : ''}.` : ''}${fotosFalharam > 0 ? ` ${fotosFalharam} foto${fotosFalharam !== 1 ? 's' : ''} não pôde${fotosFalharam !== 1 ? 'ram' : ''} ser baixada${fotosFalharam !== 1 ? 's' : ''}.` : ''}`
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
