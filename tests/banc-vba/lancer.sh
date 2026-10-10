#!/usr/bin/env bash
# Le banc des macros VBA du pilote SEE (voir LISEZMOI.md) :
#   tests/banc-vba/lancer.sh                       tous les scénarios
#   tests/banc-vba/lancer.sh "complet V5" liste    seulement ceux-là (noms de « python3 attendus.py --liste »)
# Chaque scénario tourne dans un soffice neuf (le pont UNO tombe parfois en cours de lot), arrêté après.
# Tout ce qui s'écrit va dans le dossier de travail : BANC_VBA_TRAVAIL, sinon <temp>/banc-vba ; rien dans le dépôt.
# BANC_VBA_PORT : le port du soffice du banc (2002 par défaut). Code de sortie : 0 si tout est conforme,
# 1 si un scénario ne l'est pas, 2 si le banc n'a pas pu tourner.
set -u
ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"

# ---------------------------------------------------------------- ce qu'il faut
manque=()
command -v soffice >/dev/null 2>&1 || manque+=("soffice (LibreOffice avec Calc ; Debian/Ubuntu : apt install libreoffice-calc)")
if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import uno' >/dev/null 2>&1 || manque+=("le module Python « uno » pour python3 (Debian/Ubuntu : apt install python3-uno)")
else
    manque+=("python3 (avec le module « uno » : apt install python3-uno)")
fi
command -v node >/dev/null 2>&1 || manque+=("node (il fabrique le paquet d'exemple et ses variantes)")
if [ ${#manque[@]} -gt 0 ]; then
    echo "Le banc VBA ne peut pas tourner : il manque" >&2
    for m in "${manque[@]}"; do echo "  - $m" >&2; done
    exit 2
fi

export PYTHONDONTWRITEBYTECODE=1     # pas de __pycache__ dans le dépôt
export BANC_VBA_PORT="${BANC_VBA_PORT:-2002}"
PORT="$BANC_VBA_PORT"
TRAVAIL="$(python3 "$ICI/chemins.py")" || exit 2
export BANC_VBA_TRAVAIL="$TRAVAIL"
SORTIES="$TRAVAIL/sorties"
BILAN="$TRAVAIL/bilan.txt"
PROFIL="$TRAVAIL/profil-lo"          # un profil LibreOffice à part : rien de commun avec un autre soffice
rm -rf "$SORTIES" "$TRAVAIL/trace.txt"
mkdir -p "$SORTIES" "$TRAVAIL/sonde"

port_pris() {   # vrai si quelqu'un écoute déjà sur le port
    python3 -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(0 if s.connect_ex(('localhost', $PORT)) == 0 else 1)"
}
if port_pris; then
    echo "Le port $PORT est déjà pris (un autre soffice ?) : relancer avec BANC_VBA_PORT=<autre port> $0" >&2
    exit 2
fi

# ---------------------------------------------------------------- soffice : démarrer, arrêter
PID=""
demarrer() {
    # TEMP : SondeMethodes écrit ses fichiers XML dans Environ("TEMP") (sous Windows) ; ici il les écrit
    # dans le dossier de travail. cd : CurDir, l'autre repli, y est aussi.
    ( cd "$TRAVAIL" && TEMP="$TRAVAIL/sonde" exec soffice --headless --invisible --norestore --nologo \
        "-env:UserInstallation=file://$PROFIL" "--accept=socket,host=localhost,port=$PORT;urp;" ) \
        </dev/null >>"$TRAVAIL/soffice.log" 2>&1 &
    PID=$!
    python3 "$ICI/lo_run.py" attendre </dev/null >/dev/null 2>&1
}
arreter() {
    [ -n "$PID" ] || return 0
    python3 "$ICI/lo_run.py" arreter </dev/null >/dev/null 2>&1
    local i
    for i in $(seq 1 40); do kill -0 "$PID" 2>/dev/null || break; sleep 0.5; done
    if kill -0 "$PID" 2>/dev/null; then                      # il ne s'arrête pas : le tuer, lui et soffice.bin
        pkill -TERM -P "$PID" 2>/dev/null; kill -TERM "$PID" 2>/dev/null; sleep 2
        pkill -KILL -P "$PID" 2>/dev/null; kill -KILL "$PID" 2>/dev/null
    fi
    wait "$PID" 2>/dev/null
    for i in $(seq 1 20); do port_pris || break; sleep 0.5; done
    PID=""
}
trap 'arreter' EXIT
trap 'echo "interrompu" >&2; exit 2' INT TERM

# ---------------------------------------------------------------- les paquets
PAQUET="$TRAVAIL/paquet-exemple.xlsx"
{
    echo "Banc VBA — $(date '+%Y-%m-%d %H:%M:%S')"
    echo "dépôt : $RACINE (commit $(git -C "$RACINE" rev-parse --short HEAD 2>/dev/null || echo '?')$( [ -n "$(git -C "$RACINE" status --porcelain -- see/vba 2>/dev/null)" ] && echo ' ; see/vba diffère de ce commit : modifié ou non suivi'))"
    echo "dossier de travail : $TRAVAIL"
    echo "LibreOffice : $(soffice --version 2>/dev/null | head -1)"
    echo
} > "$BILAN"
cat "$BILAN"
echo "Fabrication du paquet d'exemple (node see/exporter.js --exemple, une minute environ)…"
if ! ( cd "$TRAVAIL" && node "$RACINE/see/exporter.js" --exemple "--sortie=$PAQUET" ) </dev/null >"$TRAVAIL/fabrication.txt" 2>&1; then
    echo "Le paquet d'exemple ne se fabrique pas : voir $TRAVAIL/fabrication.txt" | tee -a "$BILAN" >&2
    exit 2
fi
tail -1 "$TRAVAIL/fabrication.txt" | tee -a "$BILAN"
for v in variante:variante casse:v_casse noms:v_noms long:v_long; do
    nom="${v%%:*}"; js="${v##*:}"
    if ! node "$ICI/$js.js" "$PAQUET" "$TRAVAIL/paquet-$nom.xlsx" </dev/null >>"$TRAVAIL/fabrication.txt" 2>&1; then
        echo "La variante « $nom » ne se fabrique pas : voir $TRAVAIL/fabrication.txt" | tee -a "$BILAN" >&2
        exit 2
    fi
done
echo "variantes : paquet-variante.xlsx (tout), paquet-casse.xlsx, paquet-noms.xlsx, paquet-long.xlsx" | tee -a "$BILAN"
echo | tee -a "$BILAN"

# ---------------------------------------------------------------- les scénarios
LISTE="$(python3 "$ICI/attendus.py" --liste)" || exit 2
if [ $# -gt 0 ]; then
    for a in "$@"; do
        printf '%s\n' "$LISTE" | cut -f1 | grep -qxF -- "$a" || { echo "scénario inconnu : « $a » (voir python3 $ICI/attendus.py --liste)" >&2; exit 2; }
    done
fi

passer() {   # $1 programme, $2 scénario, $3 variante, $4 fichier de sortie
    rm -f "$TRAVAIL/trace.txt"
    if ! demarrer; then
        echo "soffice ne répond pas sur le port $PORT (voir $TRAVAIL/soffice.log)" > "$4"
        arreter
        return
    fi
    if [ "$1" = relecture ]; then
        local var="$PAQUET"
        [ "$3" != "-" ] && var="$TRAVAIL/$3"
        timeout 900 python3 "$ICI/relecture.py" "$PAQUET" "$var" "$2" </dev/null >"$4" 2>&1
    else
        timeout 900 python3 "$ICI/regression.py" "$PAQUET" "$2" </dev/null >"$4" 2>&1
    fi
    echo "(code de sortie $?)" >>"$4"
    arreter
}

N=0; M=0; i=0
while IFS=$'\t' read -r -u 3 nom programme scenario variante; do
    if [ $# -gt 0 ]; then
        garde=0; for a in "$@"; do [ "$a" = "$nom" ] && garde=1; done
        [ $garde = 1 ] || continue
    fi
    i=$((i + 1))
    sortie="$SORTIES/$(printf '%02d' $i)-$(printf '%s' "$nom" | tr -c 'A-Za-z0-9._-' '_').txt"
    debut=$(date +%s)
    passer "$programme" "$scenario" "$variante" "$sortie"
    note=""
    if grep -q "bridge disposed\|DisposedException\|pas de soffice\|ne répond pas sur le port" "$sortie"; then
        mv "$sortie" "$sortie.chute"                  # LibreOffice est tombé : une seconde chance, dite au bilan
        passer "$programme" "$scenario" "$variante" "$sortie"
        note="repassé : soffice était tombé au premier passage ($(basename "$sortie").chute)"
    fi
    duree=$(( $(date +%s) - debut ))
    M=$((M + 1))
    if python3 "$ICI/attendus.py" "$nom" "$sortie" "$duree" "$note" >"$sortie.verdict" 2>&1; then N=$((N + 1)); fi
    cat "$sortie.verdict" | tee -a "$BILAN"
done 3< <(printf '%s\n' "$LISTE")

{
    echo
    echo "Sorties brutes : $SORTIES ; ce bilan : $BILAN"
    echo "$N / $M scénarios conformes"
} | tee -a "$BILAN"
if [ "$N" = "$M" ] && [ "$M" -gt 0 ]; then exit 0; else exit 1; fi
