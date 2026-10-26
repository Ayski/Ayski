import { IconWallet } from '../components/icons'

const VERIFIED = '26 octobre 2025'

export default function WalletInfo() {
  return (
    <div className="page">
      <div className="eyebrow">Module d’information</div>
      <h1 className="page-title">Apple Wallet</h1>
      <p className="page-sub">Rapport de faisabilité — vérifié le {VERIFIED}, pour iOS 26.6.2 sur iPhone sans ordinateur.</p>

      <div className="panel mb" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <IconWallet width={28} style={{ color: 'var(--accent)', flex: '0 0 auto' }} />
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          Cette section est <b>informative et honnête</b>. Elle ne contient <b>aucun bouton « Appliquer à Wallet »</b> :
          aucune action de cette application ne peut modifier une carte dans Wallet. Voici précisément pourquoi.
        </p>
      </div>

      <div className="info-block bad">
        <span className="badge bad">Impossible</span>
        <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Changer l’illustration d’une carte bancaire dans Wallet</h3>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          L’image d’une carte de paiement (Apple Pay) est fournie par votre banque / le réseau (Visa, Mastercard…)
          lors de l’ajout de la carte. iOS ne propose <b>aucune API publique ni réglage</b> pour la remplacer. Une PWA,
          une page web ou une application ordinaire n’a pas les permissions nécessaires — et ne peut pas les obtenir.
        </p>
      </div>

      <div className="info-block bad">
        <span className="badge bad">Hors de portée ici</span>
        <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Outils tiers (AirCard, Cardinal…)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Des projets comme <b>AirCard</b> ou <b>Cardinal</b> remplacent l’image en exploitant des failles d’iOS. Ils exigent
          soit un <b>Mac relié en USB</b>, soit un outil d’exploitation (TrollStore / KFD) et ne fonctionnent que sur
          d’<b>anciennes versions d’iOS</b> (p. ex. 15.0–16.5, ou jusqu’à 18.x pour AirCard selon les retours). Rien ne
          cible iOS 26.6.2, et ces méthodes reposent sur des exploits — ce que ce projet exclut volontairement. Elles
          peuvent casser à toute mise à jour et présentent des risques de stabilité et de sécurité.
        </p>
      </div>

      <div className="info-block ok">
        <span className="badge ok">Possible sous conditions</span>
        <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Passes Wallet personnalisées (.pkpass)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Les <b>passes</b> (fidélité, billets, cartes d’accès, cartes de visite) sont, elles, entièrement
          personnalisables. Mais un fichier <code>.pkpass</code> doit être <b>signé</b> avec un certificat « Pass Type ID »
          d’un <b>compte Apple Developer</b> (99 $/an). La signature ne peut pas se faire sur l’iPhone seul : il faut un
          service en ligne qui détient le certificat, ou un ordinateur. <b>Une carte bancaire n’est pas une passe</b> :
          créer une passe ne change pas l’apparence de votre carte de paiement.
        </p>
      </div>

      <div className="info-block ok">
        <span className="badge ok">Possible, maintenant</span>
        <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Ce que fait cette application</h3>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Créer des <b>visuels de cartes</b> de qualité commerciale et les <b>exporter en image</b> haute résolution
          (fond d’écran, maquette, impression de sticker, partage). L’aperçu « inspiré de Wallet » est une mise en
          scène graphique — <b>jamais</b> une preuve qu’une carte réelle a été modifiée.
        </p>
      </div>

      <div className="panel mb">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Passe Wallet vs. carte de paiement</h3>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          <div className="row-between" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
            <span>Passe (.pkpass)</span><span className="badge warn">Design libre, signature requise</span>
          </div>
          <div className="row-between" style={{ padding: '8px 0' }}>
            <span>Carte de paiement (Apple Pay)</span><span className="badge bad">Design verrouillé par l’émetteur</span>
          </div>
        </div>
      </div>

      <div className="panel mb">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Prérequis (si vous visez un jour les passes)</h3>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          <li>Un compte Apple Developer (99 $/an) et un certificat Pass Type ID.</li>
          <li>Un service de signature en ligne (le certificat y est déposé) ou un ordinateur.</li>
          <li>Un hébergement HTTPS pour délivrer le fichier .pkpass à l’iPhone.</li>
        </ul>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
          Si cette voie devient réalisable et vérifiable, elle sera développée comme module séparé — sans jamais
          demander de données bancaires.
        </p>
      </div>

      <div className="panel">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Sources consultées</h3>
        <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          <li><a className="link" href="https://developer.apple.com/documentation/passkit" target="_blank" rel="noreferrer">Apple — PassKit</a></li>
          <li><a className="link" href="https://developer.apple.com/wallet/" target="_blank" rel="noreferrer">Apple — Wallet Developer</a></li>
          <li><a className="link" href="https://developer.apple.com/design/human-interface-guidelines/" target="_blank" rel="noreferrer">Apple — Human Interface Guidelines</a></li>
          <li><a className="link" href="https://github.com/leminlimez/Cardinal" target="_blank" rel="noreferrer">Projet Cardinal (exploits, iOS 15–16)</a></li>
          <li>AirCard (app macOS, USB) — compatibilité exploit, non pérenne</li>
        </ul>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10 }}>
          Conclusion : sur iOS 26.6.2, depuis un iPhone seul, il n’existe <b>aucune méthode vérifiable et conforme</b>
          pour changer l’illustration d’une carte bancaire dans Wallet. L’application se concentre donc sur la création
          et l’export de visuels.
        </p>
      </div>
    </div>
  )
}
