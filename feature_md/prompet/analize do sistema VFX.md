O erro principal está na interpretação dos eixos da escala/rotação da primitive `VfxPrimitiveArbitraryQuad`.

Pelas imagens e pelo código, seu renderer está tratando o quad como um plano diferente do usado pela engine do jogo.

---

# O que está acontecendo

No jogo, o efeito:

```txt id="0u4ng9"
cracks2
```

aparece como:

* decal/projeção no chão
* quase circular
* textura proporcional
* alinhada ao plano do terreno

No seu sistema:

* o quad virou uma faixa fina
* extremamente esticado em um eixo
* aparenta estar “de lado”

Isso indica:

```txt id="q3m7g7"
erro de interpretação de eixo/rotação/escala
```

e NÃO problema na textura.

---

# O ponto crítico do código

Esse emitter:

```txt id="9epjlwm"
emitterName: string = "cracks2"
primitive: pointer = VfxPrimitiveArbitraryQuad {}
```

usa:

```txt id="o4xvdc"
birthScale0: vec3 = { 55, 600, 600 }
```

e:

```txt id="1l6m52"
birthRotation0: vec3 = { -90, -90, 0 }
```

---

# O que isso revela

Na engine da Riot:

* o quad provavelmente nasce em um eixo específico
* depois é rotacionado para deitar no chão

Mas no seu renderer:

* você está aplicando os eixos errados
* ou usando ordem de rotação diferente
* ou interpretando escala XYZ incorretamente

---

# O maior indício

Sua malha ficou assim:

```txt id="t6k8gm"
-------------------------
```

Isso significa que:

```txt id="2h49h4"
600
```

está sendo aplicado em apenas UM eixo visível.

Enquanto no jogo:

```txt id="24ivpo"
600 x 600
```

vira uma área larga no chão.

---

# O erro mais provável

Você está usando:

```txt id="4p8gku"
PlaneGeometry(width, height)
```

ou equivalente, MAS:

* associando escala em eixo errado
* OU usando Z como profundidade invisível
* OU aplicando escala antes da rotação

---

# Como a Riot provavelmente trata isso

Para `VfxPrimitiveArbitraryQuad`:

## Quad base

Provavelmente:

```txt id="j8hms5"
XY plane
```

ou:

```txt id="4f0u4i"
XZ plane
```

internamente.

Depois:

```txt id="n7jzj6"
rotation
scale
translation
```

---

# Seu renderer parece estar fazendo

Algo próximo disso:

```txt id="j8x7a2"
X = largura
Y = altura
Z ignorado
```

Mas a engine do jogo provavelmente usa:

```txt id="w7z5h7"
X = largura
Z = profundidade
Y = altura/local
```

---

# O dado que denuncia isso

```txt id="2q8ql1"
birthScale0: { 55, 600, 600 }
```

No jogo:

* isso gera um decal grande no chão

No seu:

* virou linha

Logo:

```txt id="8uj6na"
o eixo 600 não está indo para o plano correto
```

---

# Outro problema importante

## Rotação Euler

Você tem:

```txt id="q4os6x"
birthRotation0 = { -90, -90, 0 }
```

A ordem de aplicação importa MUITO.

A Riot pode usar:

```txt id="2fvlxy"
ZXY
YXZ
quaternion
```

e você talvez esteja usando:

```txt id="9npnl8"
XYZ
```

Isso sozinho pode destruir completamente a orientação do quad.

---

# O que testar AGORA

## TESTE 1 — ignorar rotação

Ignore temporariamente:

```txt id="8tmb81"
birthRotation0
```

e renderize apenas:

* quad
* escala

Se o quad virar um retângulo correto:
→ o problema é rotação.

---

## TESTE 2 — trocar eixo da escala

Teste:

```txt id="n8x6tb"
{55,600,600}
```

como:

```txt id="blc1q7"
scale.x = 600
scale.y = 600
```

ignorando o 55.

Se ficar parecido com o jogo:
→ a Riot usa outro mapeamento de eixo.

---

# Muito provavelmente o correto é:

## Riot:

```txt id="x74r7o"
X = width
Y = local height/depth
Z = height
```

## Seu renderer:

```txt id="zz00nl"
X = width
Y = height
Z = depth
```

---

# Outro detalhe MUITO importante

O efeito do jogo parece um:

```txt id="0y4e3y"
ground decal
```

não apenas um quad comum.

A Riot pode:

* projetar no terreno
* usar shader de depth fade
* usar navmesh projection

E no código existe:

```txt id="n5z3sl"
isGroundLayer: flag = true
useNavmeshMask: flag = true
```

Isso é CRÍTICO.

---

# Seu sistema provavelmente ainda NÃO implementa

## Ground projection / decal projection

Sem isso:

* o quad fica plano no espaço
* não acompanha o chão
* parece esticado e artificial

Enquanto no jogo:

* ele é projetado/adaptado ao terreno.

---

# Suspeitos principais em ordem

## 1. Mapeamento de eixo errado

MAIOR PROBABILIDADE.

---

## 2. Ordem de rotação Euler errada

ALTÍSSIMA probabilidade.

---

## 3. Escala aplicada antes da rotação

Muito provável.

---

## 4. Primitive base diferente da Riot

Possível.

---

## 5. Falta de ground projection/decal system

Também importante.

---

# Engenharia reversa recomendada

Para `VfxPrimitiveArbitraryQuad`:

Teste estas hipóteses:

| Teste                | Resultado esperado    |
| -------------------- | --------------------- |
| Quad em XY           | talvez errado         |
| Quad em XZ           | provavelmente correto |
| Ordem XYZ            | talvez errado         |
| Ordem ZYX            | talvez correto        |
| Escala antes rotação | provável erro         |
| Rotação antes escala | provável correto      |

---

# O que eu faria como engenheiro

Implementaria um modo debug:

```txt id="d7mj5m"
- mostrar eixo local
- mostrar bounding box
- mostrar normals
- mostrar pivô
- mostrar ordem transform
```

Porque seu erro claramente está na pipeline de transformação matemática do quad.
