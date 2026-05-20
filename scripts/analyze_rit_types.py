import re
from collections import Counter

path = "estrutura_bin.py"

PRIMITIVE = re.compile(
    r"\b(u8|u16|u32|u64|s8|s16|s32|s64|f32|f64|bool|string|hash|flag|symbol|keyword|vec[234]|rgb|rgba|mtx44|link)\b",
    re.I,
)


def is_primitive_rit(t: str) -> bool:
    t = t.strip()
    if not t:
        return False
    if re.match(r"^link$", t, re.I):
        return True
    if re.search(r"\b(embed|pointer|link|map)\b", t, re.I):
        return False
    if re.match(r"^list2?\[", t, re.I):
        inner = re.sub(r"^list2?\[", "", t, flags=re.I)
        inner = re.sub(r"\]$", "", inner).strip()
        if re.search(r"\b(embed|pointer|link)\b", inner, re.I):
            return False
        return True
    if re.match(r"^option\[", t, re.I):
        return True
    if re.match(r"^map\[hash,link\]", t, re.I):
        return True
    return bool(PRIMITIVE.search(t))


def classify_type(t: str) -> str:
    t = t.strip()
    if re.match(r"^map\[hash,pointer\]", t, re.I):
        return "mapHashPointer"
    if re.match(r"^map\[hash,embed\]", t, re.I):
        return "mapHashEmbed"
    if re.match(r"^map\[hash,link\]", t, re.I):
        return "mapHashLink"
    if re.match(r"^list\[f32\]", t, re.I):
        return "listF32"
    if re.match(r"^list\[string\]", t, re.I):
        return "listString"
    if re.match(r"^list\[hash\]", t, re.I):
        return "listHash"
    if re.match(r"^list\[vec2\]", t, re.I):
        return "listVector2"
    if re.match(r"^list\[vec3\]", t, re.I):
        return "listVector3"
    if re.match(r"^list\[vec4\]", t, re.I):
        return "listVector4"
    if re.match(r"^option\[f32\]", t, re.I):
        return "optionF32"
    if re.match(r"^option\[string\]", t, re.I):
        return "optionString"
    if re.match(r"^option\[vec3\]", t, re.I):
        return "optionVector3"
    if re.search(r"\b(embed|pointer|map)\b", t, re.I) and not is_primitive_rit(t):
        return "string_fallback"
    if re.search(r"\blist\b", t, re.I) and not is_primitive_rit(t):
        return "string_fallback_list"
    if is_primitive_rit(t):
        return "identified"
    return "string_unidentified"


scalar_re = re.compile(r"^\s+([A-Za-z_]\w*)\s*:\s*([^=\n{]+?)\s*=\s*(.+?)\s*$")
block_open_re = re.compile(r"^\s+([A-Za-z_]\w*)\s*:\s*([^=\n]+?)\s*=\s*\{\s*$")
list_open_re = re.compile(r"^\s+([A-Za-z_]\w*)\s*:\s*(list2?\[[^\]]+\])\s*=\s*\{\s*$")
struct_re = re.compile(r"^\s+([A-Za-z_]\w*)\s*:\s*\b(embed|pointer|link)\s*=\s*")

all_types: Counter[str] = Counter()
unidentified: Counter[str] = Counter()
unidentified_examples: dict[str, str] = {}
fallback_list: Counter[str] = Counter()

with open(path, encoding="utf-8", errors="replace") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line.strip() or line.strip().startswith("#"):
            continue
        if struct_re.match(line):
            continue
        rit_type = None
        m = list_open_re.match(line)
        if m:
            rit_type = m.group(2).strip()
        else:
            m = block_open_re.match(line)
            if m:
                rit_type = m.group(2).strip()
            else:
                m = scalar_re.match(line)
                if m and "{" not in m.group(2):
                    rit_type = m.group(2).strip()
        if not rit_type:
            continue
        all_types[rit_type] += 1
        cat = classify_type(rit_type)
        if cat == "string_unidentified":
            unidentified[rit_type] += 1
            if rit_type not in unidentified_examples:
                unidentified_examples[rit_type] = line.strip()[:140]
        elif cat.startswith("string_fallback"):
            fallback_list[rit_type] += 1

print("=== TIPOS NAO IDENTIFICADOS (viram string) ===")
for t, c in unidentified.most_common(80):
    print(f"{c:5}  {t}")
    print(f"       ex: {unidentified_examples.get(t, '')}")
print(f"\nUnicos: {len(unidentified)} | Ocorrencias: {sum(unidentified.values())}")

print("\n=== LIST/MAP NAO PRIMITIVOS (fallback string no parser) ===")
for t, c in fallback_list.most_common(40):
    print(f"{c:5}  {t}")
print(f"\nUnicos: {len(fallback_list)} | Ocorrencias: {sum(fallback_list.values())}")

print("\n=== TODOS OS TIPOS UNICOS (por frequencia) ===")
for t, c in all_types.most_common():
    cat = classify_type(t)
    note = ""
    if cat == "string_unidentified":
        note = " -> STRING (nao identificado)"
    elif cat.startswith("string_fallback"):
        note = " -> estrutural / fallback"
    elif cat not in ("identified",):
        note = f" -> {cat}"
    print(f"{c:5}  {t}{note}")

# PascalCase / custom enum-like (not in known primitives)
custom = [
    (t, c)
    for t, c in all_types.items()
    if re.match(r"^[A-Z][A-Za-z0-9_]*$", t)
    and classify_type(t) == "string_unidentified"
]
if custom:
    print("\n=== TIPOS CUSTOM (PascalCase) ===")
    for t, c in sorted(custom, key=lambda x: -x[1]):
        print(f"{c:5}  {t}")

print("\n=== RESUMO ===")
print(f"Tipos unicos totais: {len(all_types)}")
print(f"Linhas com tipo extraido: {sum(all_types.values())}")
identified = sum(c for t, c in all_types.items() if classify_type(t) == "identified")
print(f"Ocorrencias tipo identificado (primitivo): {identified}")
