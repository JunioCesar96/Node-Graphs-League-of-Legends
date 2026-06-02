Especificação do Sistema: birthOrbitalVelocity
Descrição:
O sistema birthOrbitalVelocity controla simultaneamente a orientação inicial (facing) do plano de partículas (VfxEmitterDefinitionData) e a velocidade de rotação contínua da sua textura (UV) em torno de um eixo específico.

Estrutura de Dados de Exemplo:

JSON
birthOrbitalVelocity: embed = ValueVector3 {
    constantValue: vec3 = { 0, 0, 12 }
}
Parâmetro:

constantValue: vec3 = { x, y, z }: Define a velocidade angular (em graus por frame) e o eixo no qual a rotação da UV será aplicada. O eixo que receber o valor determinará a orientação física da malha do emissor.

Regras de Orientação da Malha e Rotação da UV:

O sistema deve ler os valores de x, y, z e aplicar o seguinte comportamento para o VfxEmitterDefinitionData:

Órbita Z (constantValue na posição Z):

Orientação da Face: O plano do emissor fica na horizontal (paralelo aos eixos X e Y do chão). Sua face (Normal) aponta para CIMA, no eixo perpendicular Z.

Comportamento: A imagem (UV) rotaciona em torno do eixo Z (giro de "disco" ou "furacão" no chão).

Órbita X (constantValue na posição X):

Orientação da Face: O plano do emissor fica na vertical. Sua face (Normal) aponta para a FRENTE, na mesma direção do personagem (eixo X).

Comportamento: A imagem (UV) rotaciona em torno do eixo X (giro perpendicular ao trajeto do projétil/personagem, como um "escudo frontal").

Órbita Y (constantValue na posição Y):

Orientação da Face: O plano do emissor fica na vertical. Sua face (Normal) aponta para os LADOS (eixo Y, perpendicular à direção do personagem e ao chão).

Comportamento: A imagem (UV) rotaciona em torno do eixo Y (giro lateral, como uma "roda de carro").

Exemplo Prático de Execução:
Se o sistema receber constantValue: vec3 = { 0, 0, 12 } no momento do spawn (nascimento) da partícula:

A engine identificará que o valor está no eixo Z.

O plano do emissor será deitado no chão (face para cima).

A cada frame, a UV rotacionará 12 graus no eixo Z.
