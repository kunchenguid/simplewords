/* global React, FloatingButton, RefinePanel */
const { useState, useRef, useEffect } = React;

const ROUGH_DRAFT = `hey sarah saw the brief, looks ok. ill have something thursday. couple Qs coming separate.`;

const REFINED = `Hi Sarah,

Thanks for sending the brief - I'll have a first pass back to you by Thursday. A couple of small questions are coming in a separate note.

Best,
Kun`;

function HostPage() {
  const [draft, setDraft] = useState(ROUGH_DRAFT);
  const [phase, setPhase] = useState('idle'); // idle | working | result
  const [panelMessage, setPanelMessage] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const editorRef = useRef(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  // Position the FAB just below the editor's bottom-right.
  useEffect(() => {
    function reposition() {
      const el = editorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const parent = el.closest('.host').getBoundingClientRect();
      setAnchor({
        top: r.bottom - parent.top + 10,
        left: r.right - parent.left - 150
      });
    }
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, []);

  function refine() {
    if (!draft.trim()) {
      setPanelMessage('Write a rough reply first.');
      setReplacement(null);
      setPhase('result');
      return;
    }
    setPhase('working');
    setPanelMessage('Refining…');
    setReplacement(null);
    setTimeout(() => {
      setPanelMessage(REFINED);
      setReplacement(REFINED);
      setPhase('result');
    }, 1100);
  }

  function replace() {
    setDraft(replacement);
    setPhase('idle');
    setPanelMessage(null);
    setReplacement(null);
  }

  function dismiss() {
    setPhase('idle');
    setPanelMessage(null);
    setReplacement(null);
  }

  // Panel sits ABOVE the button (matching panelPositionAboveButton in src).
  const panelAnchor = {
    top: anchor.top - 230,
    left: anchor.left - 80
  };

  return (
    <div className="host">
      <div className="host__chrome">
        <div className="host__bar">
          <span className="dot" style={{background:'#ff5f57'}}></span>
          <span className="dot" style={{background:'#febc2e'}}></span>
          <span className="dot" style={{background:'#28c840'}}></span>
          <span className="title">Re: Q4 Brand Brief — first round</span>
          <span className="meta">mail.host · inbox</span>
        </div>
        <div className="host__subj">
          <b>To</b>sarah@studio.example
        </div>
        <div className="host__quote">
          <p><span className="from">Sarah Lin</span> <span style={{color:'#80868b'}}>· Wed 8:42</span></p>
          <p>Hey Kun - attaching the Q4 brand brief draft. Would love a first pass by end of week if possible. Open to anything you'd push back on. Thanks!</p>
        </div>
        <div className="host__editor">
          <textarea
            ref={editorRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
          />
          <button className="host__send">Send</button>
        </div>
      </div>

      <FloatingButton
        onClick={refine}
        top={anchor.top}
        left={anchor.left}
        working={phase === 'working'}
      />

      {(phase === 'working' || phase === 'result') && (
        <RefinePanel
          state={phase === 'working' ? 'loading' : 'ready'}
          message={panelMessage}
          replacement={replacement}
          onReplace={replace}
          onDismiss={dismiss}
          top={panelAnchor.top}
          left={panelAnchor.left}
        />
      )}
    </div>
  );
}

window.HostPage = HostPage;
