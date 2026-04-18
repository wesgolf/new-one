import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Paperclip, Upload, X } from 'lucide-react';
import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from '../lib/utils';
import type { IdeaRecord } from '../types/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'demo',        label: 'Demo',        desc: 'First spark, raw idea'        },
  { value: 'in_progress', label: 'In Progress', desc: 'Actively building'            },
  { value: 'review',      label: 'Review',      desc: 'Ready for feedback'           },
  { value: 'done',        label: 'Done',        desc: 'Finimport React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music',import { Loader2, Musi 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/sup[
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from 'beimport { cnl', 'Lo-fi', 'Experimental', 'Other',
];

constimport type { IdeaRecord } from 'ls
// ─── Constants ────────?te
const STATUSES = [
  { value:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In Progress', desc: 'Actively building'            }?? { value: 'review',      label: 'Review',      desc: 'Ready for feedback'           }? { value: 'done',        label: 'Done',        desc: 'Finimport React, { useCallback,e:import { Loader2, Music',import { Loader2, Musi 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',import { saveIdea, saveIdeaAsse??  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',import { saveIdea,?mport { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from 'beimport { cnl', 'Lo-fi', 'Exa,import { cn } from 'beimport { cnl', 'Lo-fi', 'ExperimuthU];

constimport type { IdeaRecord } from 'ls
// ─── Constants ?ull);// ─── Constants ─────?=const STATUSES = [
  { value:outline-none focus:ri]   { value:outline);c  const [description, setDescription] = useState('');
  const [status,  
// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In Progress',te(  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',import { saveIdea, saveIdeaAsse??  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',import { saveIdea,?mport { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from 'beimport { cnl', 'Lo-fi', 'Exa,import { cn } from 'beimport { cnl', 'Lo-fi', 'ExperimuthU];

constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  setIsDragging]  = useState(false);
  const [fileError,   setFileError]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [formError,   s
constimport type { IdeaRecord } from 'ls
// ─── Constants ?ull);// ─── Constants ─────.ti// ─── Constants ?ull);// ──   setDescription(idea?.description ?? '');
    setStatus(idea?.status ?? 'demo');
    setBp  const [status,  
// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In Proe // ─── PropCoimport { cn } from 'beimport { cnl', 'Lo-fi', 'Exa,import { cn } from 'beimport { cnl', 'Lo-fi', 'ExperimuthU];

constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  setIsDragging]  = useState(false);
  const [fileError,   setFileError]   = useState<string | null>(nty
constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  setIsDragging]  = useState(false);
      r  const [isDraggingi  setIsDragging]  = useSta*   const [fileError,   setFileError]   = useState<string{MAX_AUDIO_MB} MB.`);
      return;
    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idean// ─── Constants ?ull);// ──st    setStatus(idea?.status ?? 'demo');
    setBp  const [status,  
// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In Prag    setBp  const [status,  
// ──  // ─── Props ──?c
constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  setIsDragging]  = useState(false);
  const [fileError,   setFileError]   = useState<string | null>(nty
constimport type { IdeaRecorFile | null>(nuret  const [isDraggingi  setIsDragging]  = useStaul  const [fileError,   setFileError]   = useState<string  constimport type { IdeaRecorFile | null>(null);
  const [isDraggine.  const         description: description.trim()       r  const [isDraggingi  setIsDragging]  = useSta* be      return;
    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
      set  const [formEra?constimport type { IdeaRecge ul    setBp  const [status,  
// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In Prag    setBp  const [stpl// ─── Props ──?t// ──  // ─── Props ──?c
constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  set);constimport type { IdeaRecorFile | nul    const [isDraggingi  setIsDragging]  = useSta    const [fileError,   setFileError]   = useState<string
 constimport type { IdeaRecorFile | null>(nuret  const [isDraggingioj  const [isDraggine.  const         description: description.trim()       r  const [isDraggingi  setIsDragging]  = useSta* be      return;
    }
    setFileError(null);
    set  const [formError,  ea    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
  P   se     set  const [formErration in Supabase.'
          :       set  const [formEra?constimport type { IdeaRecge ul    setBp  constop// ─── Props ──? { value: 'demo'??  { value: 'in_progress', label: 'In s-constimport type { IdeaRecorFile | null>(null);
  const [isDraggingi  set);constimport type { IdeaRecorFile | nul    const [isDraggingi  setIsDragging]  = useSta    const [fild-  const [isDraggingi  set);constimport type { ma constimport type { IdeaRecorFile | null>(nuret  const [isDraggingioj  const [isDraggine.  const         description: description.trim()       r  const [isDraggingi  set      }
    setFileError(null);
    set  const [formError,  ea    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
  P   se  
            <div>
                 setFileError(null);
    set  cte    set  const [formEr  constimport type { IdeaRecge  '  P   se     set  const [formErration in Supabase.'
          :       setpx        edium text-slate-400 uppercase tracking-wide  const [isDraggingi  set);constimport type { IdeaRecorFile | nul    const [isDraggingi  setIsDragging]  = useSta    const [fild-  const [isDraggingi  set);constimport type { ma constimport type { IdeaRecorFile | null>l     setFileError(null);
    set  const [formError,  ea    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
  P   se  
            <div>
                 setFileError(null);
    set  cte    set  const [formEr  constimport type { IdeaRecge  '  P   se     set  const [formmE    set  const [formEr      setFileError(null);
    set  c =    set  const [formErclconstimport type { IdeaRecge te  P   se  
            <div>
                 setFileError(null);
    set</                                 set  cte    set  const [formEr  *          :       setpx        edium text-slate-400 uppercase tracking-wide  const [isDraggingi  set);constimport typ/*    set  const [formError,  ea    }
    setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
  P   se  
            <div>
                 setFileError(null);
    set  cte    set  const [formEr  constimport type { IdeaRecge  '  P   se   .value);     setFileError(null);
    set  c      set  const [formErClconstimport type { IdeaRecge -3  P   se  
            <div>
                 setFileError(null);
    setor         as                -[    set  cte    set  const [formEr ui    set  c =    set  const [formErclconstimport type { IdeaRecge te  P   se  
            <div>
                 setFileError(null);
    set</  }
            <div>
                 setFileError(null);
    set</            on                      set</                          
     setFileError(null);
    set  const [formError,   s
constimport type { IdeaRecge = usconstimport type { Idepublic:   isPubl   
  P   se  
            <div>
                 setFileError(null);
    set  cte    set  const [formno    set  const [formEr  constimport type { IdeaRecge St  P   se  
            <div>
                 setFileError(null);
    setla                           Na    set  cte    set  const [formEr       set  c      set  const [formErClconstimport type { IdeaRecge -3  P   se  
            <div>
             bu            <div>
                 setFileError(null);
    setor             c                      setor         as               de            <div>
                 setFileError(null);
    set</  }
            <div>
                 setFileError(null);
    set</            on     or                ve    set</  }
            <div>
                                         set</            on            t-     setFileError(null);
    set  const [formError,   s
constimport type { px    set  const [formErr lconstimport type { IdeaRecge     P   se  
            <div>
                 setFileError(null);
    setv>                           /}    set  cte    set  const [formno d-            <div>
                 setFileError(null);
    setla                           Na    s                        setla                           m            <div>
             bu            <div>
                 setFileError(null);
    setor             c                      setor         as  }
             bu cl                 setFileError(n      setor             c            di                 <label className={labelCls}>Key</label>
              <select
                v    set</  }
            <div>
    ng           et                va    set</            on     or     pu            <div>
                                         No                      set  const [formError,   s
constimport type { px    set  const [formErr lconstimport type { I  constimport type { px    set               <div>
                 setFileError(null);
    setv>                      >
                el    setv>                          
                  setFileError(null);
    setla                           Na    s                 setla                           k             bu            <div>
                 setFileError(null);
    setor             c                      s                   setFileError(n      setor             c            r              bu cl                 setFileError(n      setor   ==              <select
                v    set</  }
olet-50 text-violet-700'
                      : 'border-slate-100 text-slate-600 hover:borde                v                 <div>
    ng     >    ng                                                     No                      set  const [formError,     constimport type { px    set  const [formErr lconstimport type { I  constimport type { px e                  setFileError(null);
    setv>                      >
                el    setv>                  gi    setv>                      >
  av                el    setv>                        setFileError(null);
    setla     k=    setla                           ?.                 setFileError(null);
    setor             c                      s                   setFileError(n      sebo    setor             c            it                v    set</  }
olet-50 text-violet-700'
                      : 'border-slate-100 text-slate-600 hover:borde                v                 <div>
    ng   g-emerald-50 cursor-default'
    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng     >    ng                                                     No                      set  const oF    setv>                      >
                el    setv>                  gi    setv>                      >
  av                el    setv>                        setFileError(null);
    setla     k=    setla                           ?.       ud                el    setv>        av                el    setv>                        setFileError(null);
   e.    setla     k=    setla                           ?.                 se      setor             c                      s                   setFileError(n      seboioolet-50 text-violet-700'
                      : 'border-slate-100 text-slate-600 hover:borde                v                 <div>
    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 text-violet-order-slat                    el    setv>                  gi    setv>                      >
  av                el    setv>                        setFileError(null);
    setla     k= p>
                  <p clas  av                el    setv>                        setFileError(null);
   />    setla     k=    setla                           ?.       ud          ={   e.    setla     k=    setla                           ?.                 se      setor             c                      s                   setFileError(n      sebo{f                      : 'border-slate-100 text-slate-600 hover:borde                v                 <div>
    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
ro    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 teer  av                el    setv>                        setFileError(null);
    setla     k= p>
                  <p clas  av                el    setv>                        setFileErro"h    setla     k= p>
                  <p clas  av                el    se                    se   />    setla     k=    setla                           ?.       ud          ={   e.    setla          ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
ro    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 teer  av                el    setv>                        setFileError(null);
-0ro    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-defau      olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    nia    setla     k= p>
                  <p clas  av                el    setv>                        setFileErro"h    setla     k= p>
                  <p clas  av                el r-                  nt                  <p clas  av                el    se                    se   />    setla     k=    setla        ro    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-default'
    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 teer  av                el    setv>                        setFileEto    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    nn -0ro    ng   g-emerald-50tr                      :      ng   g-emerald-50 cursor-defau      olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    nia    ssl                  <p clas  av                el    setv>                        setFileErro"h    setla     k= p>
                  <p clas  av                el r-                  nt           bl                  <p clas  av                el r-                  nt                  <p clas  av            la    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 teer  av                el    setv>                        setFileEto    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    nn -0ro    nl                  <p clas  av                el r-                  nt           bl                  <p clas  av                el r-                  nt                  <p clas  av            la    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    ng   </    olet-50 teer  av                el    setv>                        setFileEto    olet-50 text-vio</    olet-50 text-violet-order-slat      bg-slate-50 cursor-    nn -0ro    nl                  <p clas  av                el r-                  nt           bl     -slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="idea-form"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : idea ? 'Save changes' : 'Create track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
